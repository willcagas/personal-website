---
title: "DeepSeek-V3 From Scratch"
---

<!-- Local only (gitignored) while the post is coming soon: wcagas.com shows "Coming soon"
     in place of this, and localhost shows it in full.

     An implementation deep dive. The code is as central as the theory. Every section helps answer:
       What is DeepSeek-V3 doing? How did I implement it? How do I know it works?

     Each technical section:
       1. Motivation and intuition: the problem, why DeepSeek uses it, the conventional approach
       2. Mathematical foundations: the equations, tensor shapes, diagrams
       3. Implementing it from scratch: real snippets, each followed by why I wrote it that way
       4. Verification and debugging: tests, numerical checks, bugs and their fixes
       5. Experiments and observations, only where they earn it

     Assumes the reader knows transformers. Space follows novelty: RMSNorm ~300 words, MLA 1,500+.
     Explain the code, don't narrate it ("to compress the hidden states into the latent, I…",
     not "first, import torch"). Full code lives in the repo; the post shows the parts worth understanding.

     Priority: MLA, MoE and the compressed KV cache working correctly first. MTP is the only
     optional feature. -->

## Introduction

It's 2026, and with all of the *attention* on agentic AI, lots of the conversation around AI has become high-level and more abstract. I wanted to get into the nitty-gritty and learn more about some of the modern LLM architecture that powers these systems underneath.

[DeepSeek-V3](https://arxiv.org/abs/2412.19437) is an open-source Mixture of Experts (MoE) language model with 671B total parameters, with 37B activated per token. It incorporates many interesting architectural innovations and tricks that are still relevant to modern LLMs today such as multi-head latent attention (MLA), DeepSeekMoE, and multi-token prediction (MTP).

The overall architecture looks like this:

<figure class="blog-figure" data-figure="ds-architecture">
<div class="live-figure"><canvas aria-label="A token goes up DeepSeek-V3 from its embedding through 61 transformer blocks to the next-token probabilities, zooming into one block's Multi-Head Latent Attention and then its DeepSeekMoE layer on the way"></canvas></div>
<figcaption>DeepSeek-V3 modeled after Figure 2 of the report. It zooms into one block's multi-head latent attention, then its DeepSeekMoE layer. Blue indicates what is cached during inference.</figcaption>
</figure>

The main goal of this project is to thoroughly learn about and implement DeepSeek-V3's architecture, part by part, from scratch. The secondary goal is to then build a miniature, scaled-down version of the LLM, then pretrain and post-train it to see if the architecture holds up at a smaller parameter count.

Thus, the code/implementation and writing of this article (except animations) are *handwritten* with little AI polish for technicality. However, AI has been a great teacher, and going back and forth to refine my understanding has been quite useful alongside reading the paper and watching videos on individual concepts.

I will start by talking about the individual building blocks of DeepSeek-V3 before diving into its main architectural components and assembling and training my own miniature version!

## DeepSeek Building Blocks

DeepSeek-V3 employs many repeated components throughout its architecture, with each serving a different purpose in the system. The main components include RMSNorm for layer normalization, SwiGLU for feed-forward computation, and RoPE for positional encoding.

### RMSNorm

Activations within transformer neural networks (NNs) can reach massively different scales leading to unstable training. Layer Normalization (LayerNorm) is a technique that controls inputs or hidden activations by zeroing the mean and scaling to unit variance, thus helping stabilize and accelerate training.

**Root Mean Square Layer Normalization (RMSNorm)** is a simpler alternative to LayerNorm, where instead of mean-centering and variance, it calculates and normalizes activations using their root mean squares.

It can be represented as

$$
\operatorname{RMSNorm}(x)_i =
\gamma_i \frac{x_i}{
\sqrt{\frac{1}{d}\sum_{j=1}^{d}x_j^2+\epsilon}
}
$$

where $x_i$ is the value of feature $i$, $d$ is the hidden size, $\gamma_i$ is a learned scaling parameter shared across tokens per feature $i$, and $\epsilon$ is a small hyperparameter to prevent division by 0.

<figure class="blog-figure" data-figure="ds-rmsnorm">
<div class="live-figure"><canvas aria-label="A vector is divided by its root mean square until that root mean square is one. Its mean is scaled along with it and never subtracted, and then each entry is scaled by a learned gain"></canvas></div>
<figcaption>RMSNorm scales a vector by its root mean square and multiplying each feature by a learned scaling parameter.</figcaption>
</figure>

I compute this as such:

```python
squares = x.pow(2)
mean = squares.mean(dim=-1, keepdim=True)

# add epsilon to prevent div by 0 when calculating norm
root = (mean + self.epsilon).sqrt() 

# divide each token's features by its RMS using broadcasting
norm = x.div(root) 

# one learned "scale" per feature and each shared across tokens
rms_norm = norm * self.gamma 
```

RMSNorm is used throughout the DeepSeek architecture including before attention and feed-forward layers, after the final transformer block, and within extra prediction layers.

### SwiGLU

FFNs use nonlinear activation functions to help transformers learn complex patterns in addition to linear transformations. **Swish Gated Linear Unit (SwiGLU)** is a gated activation function used in transformer FFNs. Unlike other activation functions like ReLU, SwiGLU incorporates two learned linear projections, one for the **gate** and another for the **values**.

The gate projection goes through a Swish activation function (SiLU) which multiplies the input with its own sigmoid. This result is then element-wise multiplied with the up (value) projection.

Formally, this is represented as

$$
\operatorname{SwiGLU}(x) = \operatorname{SiLU}(xW_g) \odot (xW_u)
$$

where $W_g$ and $W_u$ are learned linear projections, $\operatorname{SiLU}(z) = z \cdot \sigma(z)$, and $\odot$ is element-wise multiplication.

Usually, SwiGLU is the main component of a complete FFN, adding a third learned *down* projection $W_d$, to bring the output back to the model's original hidden size, creating a SwiGLU block.

<figure class="blog-figure" data-figure="ds-swiglu">
<div class="live-figure"><canvas aria-label="The normalized vector goes through a gate projection and an up projection side by side, SiLU bends the gate, the two are multiplied column by column, and a down projection brings it back to the model's width"></canvas></div>
<figcaption>SwiGLU uses SiLU to transform the gate projection and then is multiplied element-wise with the up projection. Then a final down projection is used.</figcaption>
</figure>

I implement this as follows:

```python
gate_proj = self.gate_linear(x)
swish_gate = gate_proj * torch.sigmoid(gate_proj)
up_proj = self.up_linear(x)

 # final linear layer, combined SwiGLU @ W_out 
swi_glu = self.down_linear(swish_gate * up_proj)
```

SwiGLU feed-forward blocks are used throughout DeepSeek such as the individual networks within DeepSeekMoE.

### Rotary Positional Embeddings (RoPE)

A known limitation of self-attention is that it has no account for the position of words in a sentence, which is integral to understanding language. A standard solution is to add a separate position vector to content-based token embeddings, mixing "what the word is" with "where the word is".

**Rotary Positional Embeddings (RoPE)** is a different approach where positional information is encoded by *rotating* pairs of features in the query and key vectors based on their token positions, instead of adding positional information directly to the input.

Intuitively, although a token's query and key vectors are high-dimensional, RoPE applies 2D rotations by splitting features into pairs. These pairs are then rotated by an angle based on that token's position in a sequence.

For each pair of features, the **rotation angle** can be defined as

$$
\theta_{m,j} = m \cdot \frac{1}{10000^{2j/d}}
$$

where $m$ is the token position, $j$ is the feature-pair index, and $d$ is the feature dimension of the query/key vectors being rotated.

I precompute these rotation angles as follows:

```python
pair_indices = torch.arange(0, feature_size // 2)

# constant rotation rate for each feature-pair, shared across every query and key vector
self.rotation_rates = 1 / (10000 ** (2 * pair_indices / feature_size))

token_pos = torch.arange(0, sequence_len).view(sequence_len, 1)

# angle = token pos x rotation rate
rotation_angles = token_pos * self.rotation_rates

self.register_buffer("rotation_angles", rotation_angles, persistent=False)
```

To be clear, each feature pair has its own fixed **rotation rate** that is shared across all tokens and their corresponding query/key pairs. The actual rotation angle depends on the rotation rate since it's multiplied by the token's position, meaning that some pairs rotate faster than others.

Remember from linear algebra class, mathematically, the rotation of a feature pair $(a,b)$ by angle $\theta$ is:

$$
\begin{bmatrix}
a' \\
b'
\end{bmatrix}
=
\begin{bmatrix}
\cos\theta & -\sin\theta \\
\sin\theta & \cos\theta
\end{bmatrix}
\begin{bmatrix}
a \\
b
\end{bmatrix}
$$

The important property of RoPE is that although queries and keys are rotated based on their *absolute* positions, their dot product relies on their relative positions between each other. This means that if two tokens are shifted but have the same relative distance, they will also have the same attention score (assuming nothing else changed).

<figure class="blog-figure" data-figure="ds-rope-dials">
<div class="live-figure"><canvas aria-label="Thirty-two dials, one for each rotating pair, each with a query hand and a key hand. As both tokens slide along a position track every hand turns, the fast pairs more than the slow ones, while the angle between each pair of hands and the attention score stay the same. When the offset between the tokens grows, the score moves along its curve"></canvas></div>
<figcaption>RoPE rotates query and key feature pairs at different frequencies making their attention scores dependent on relative token positions.</figcaption>
</figure>

I implement the actual rotation as such:

```python
cos = angles.cos()
sin = angles.sin()

# split the last dim into pairs
x = x.reshape(*original_shape[:-1], original_shape[-1] // 2, 2)

# first (a) and second (b) values of every pair
a = x[..., 0]
b = x[..., 1]

# apply rotation linear transformation
rotated_a = a * cos - b * sin
rotated_b = a * sin + b * cos

# combine rotated values from a and b (respectively) into pairs along the last dimension
x = torch.stack((rotated_a, rotated_b), dim=-1)
x = x.reshape(original_shape)
```

Here, I split the features into pairs, apply the 2D rotation using the sines and cosines of the precomputed rotation angles, and then combine values into its original shape.

In DeepSeek-V3, RoPE is applied to queries and keys before computing the attention scores.

## Multi-Head Latent Attention (MLA)

Multi-head attention (MHA) is a technique in transformers that uses multiple attention heads, each computing their own query, key, and value vectors, to learn which tokens are contextually relevant to each other within sequences. During autoregressive decoding, instead of recomputing previously computed keys and values each step, they are stored in a KV cache. However, as the sequence length increases, more vectors are stored in the cache which uses more memory.

In DeepSeek, **multi-head latent attention (MLA)** was introduced to tackle this problem through **low-rank joint KV compression**. These are fancy words for saying that these high-dimensional vectors are compressed into smaller latent representations before being put into the KV cache.

<figure class="blog-figure" data-figure="ds-mla-squares">
<div class="live-figure"><canvas aria-label="Squares standing for 64 numbers each: the hidden state's 7,168 numbers fly into a 512-number latent, and every head's keys and values are recovered from it, before only the latent is kept"></canvas></div>
<figcaption>MLA compresses hidden representations into smaller, 512 dimensional latents, and all 128 attention heads' keys and values are recovered from it. The latents are kept in the KV cache.</figcaption>
</figure>

To start, for a token at position $t$, MLA compresses the hidden representation into separate KV and query latents through learned down projections:

$$
\begin{aligned}
\mathbf{c}_t^{KV} &= \operatorname{RMSNorm}(W^{DKV}\mathbf{h}_t) \\
\mathbf{c}_t^Q &= \operatorname{RMSNorm}(W^{DQ}\mathbf{h}_t)
\end{aligned}
$$

Note how an RMSNorm is used to normalize the features. Then, learned up projections are employed to reconstruct the query, key, and value vectors per attention head:

$$
\begin{aligned}
\mathbf{q}_{t,i}^{C} &= W_i^{UQ}\mathbf{c}_t^Q \\
\mathbf{k}_{t,i}^{C} &= W_i^{UK}\mathbf{c}_t^{KV}, \qquad
\mathbf{v}_{t,i}^{C} = W_i^{UV}\mathbf{c}_t^{KV}
\end{aligned}
$$

Here, $\mathbf{h}_t$ is the input hidden representation, $i$ is attention head index, and $C$ means the **content components**, which don't have RoPE applied to them. It's also important to understand that keys and values are both reconstructed from the same compressed KV latent, thus each head *shares* this latent rather than having distinct compressed latents.

I implement these as follows:

```python
# compute prefill's kv latents on first pass and each token's latents after
kv_compressed = self.kv_norm(self.kv_proj(x))

q_compressed = self.q_norm(self.q_proj(x))
q_con = self.q_con_proj(q_compressed).reshape(batch_size, sequence_len, self.num_heads, self.nope_dim)

# expand the shared KV latents into every head's keys and values
k_con = self.k_con_proj(kv_compressed).reshape(batch_size, sequence_len, self.num_heads, self.nope_dim)
values = self.v_proj(kv_compressed).reshape(batch_size, sequence_len, self.num_heads, self.value_dim)
```

Next involves incorporating the positional information. As explained in the previous section, RoPE rotates queries and keys based on token positions. Instead of applying RoPE directly to the reconstructed content representations, DeepSeek keeps them unrotated and makes *separate* positional query and key components just for receiving RoPE. This is known as **decoupled RoPE**:

```python
# shared positional key
k_pos = self.k_pos_proj(x)
q_pos = self.q_pos_proj(q_compressed).reshape(batch_size, sequence_len, self.num_heads, self.rope_dim)

# rotate positional features
rope_q, rope_k = self.rope(q_pos, k_pos, start_pos=start_pos)
```

Now, each query and key vector can be shown as a composition of

$$
\mathbf{q}_{t,i} = [\mathbf{q}_{t,i}^{C};\mathbf{q}_{t,i}^{R}], \qquad
\mathbf{k}_{t,i} = [\mathbf{k}_{t,i}^{C};\mathbf{k}_{t}^{R}]
$$

where $R$ means the **positional components**. It's easy to miss, but notice here how the positional key representation $\mathbf{k}_t^R$ is attention-head independent. In other words, this vector is *shared* with all attention heads.

I compute each vector as such:

```python
# share the rotated positional keys across heads
k_pos = rope_k.unsqueeze(2).expand(-1, -1, self.num_heads, -1)

# combine content and positional features
queries = torch.cat((q_con, rope_q), dim=-1).transpose(1, 2)
keys = torch.cat((k_con, k_pos), dim=-1).transpose(1, 2)
values = values.transpose(1, 2)
```

Now with the actual full queries, keys, and values, the next steps are relatively straightforward, following **scaled dot-product attention**. This includes calculating attention weights with causal masking and a softmax, then taking the weighted sum of values.

Each attention head computes its own attention weights using both the content similarity and the relative positional information:

$$
\alpha_{t,j}^{(i)} =
\operatorname{softmax}_{j \leq t}\left(
\frac{
(\mathbf{q}_{t,i}^{C})^\top\mathbf{k}_{j,i}^{C}
+
(\mathbf{q}_{t,i}^{R})^\top\mathbf{k}_{j}^{R}
}{\sqrt{d_c+d_r}}
\right)
$$

where $j$ is the position of the token being attended to and $d_c$ and $d_r$ are the content and positional dimensions of the respective query/key vectors.

Then, these weights are used to compute the weighted sum of values for each head:

$$
\mathbf{o}_{t,i} = \sum_{j \leq t}\alpha_{t,j}^{(i)}\mathbf{v}_{j,i}^{C}
$$


$\alpha_{t,j}^{(i)}$ is the attention weight assigned to token $j$ by head $i$, and $\mathbf{o}_{t,i}$ is that specific head's output.

I implement all of these steps using PyTorch's `scaled_dot_product_attention`:

```python
head_outputs = F.scaled_dot_product_attention(
    queries, keys, values,
    dropout_p=0.0,
    is_causal=True,
    scale=(self.nope_dim + self.rope_dim) ** -0.5
)

# remove padded value features and concatenate the heads
head_outputs = head_outputs[..., :self.value_dim]
combined = head_outputs.transpose(1, 2).reshape(batch_size, sequence_len, self.num_heads * self.value_dim)
```

This is how I compute attention during training, which uses uncached latents and reconstructs keys and values from their compressed KV latents. However, I use a different approach during cached decoding which uses the compressed representations without any reconstruction needed.

### Compressed KV Caching

During cached decoding, MLA stores two things including the compressed KV latents and the rotated positional keys. This greatly reduces the memory required for the KV cache, as opposed to storing the full keys and values for every attention head.

<figure class="blog-figure" data-figure="ds-cache-memory">
<div class="live-figure"><canvas aria-label="Two equal blocks of memory fill as tokens arrive. Caching every head's keys and values fills one after 4 tokens, while caching the latent fills the other only after 227"></canvas></div>
<figcaption>KV cache comparison showing regular keys and values storing 32,768 numbers for every token compared to 576 for the compressed latent and the rotary key.</figcaption>
</figure>

During prefill, the entire prompt is processed to populate both caches. Then, each newly generated token appends its compressed KV latent to the existing cache:

```python
if use_cache:
    if self.kv_cache is None:
        self.kv_cache = kv_compressed
    else:
        # concat existing cached kv latents with new latents from single token
        self.kv_cache = torch.cat((self.kv_cache, kv_compressed), dim=1)

    kv_compressed = self.kv_cache
```

The positional key cache works in a similar way. In addition, the length of this cache is used to figure out the starting position. This is so that generated tokens receive the right RoPE rotations based on their current position in the sequence.

Now, the neat optimization trick used to calculate attention during decoding is called **weight absorption**. Since we've compressed the keys and values into latents, normally, we would need to reconstruct them using their learned up projection before calculating attention. Weight absorption lets us bypass this completely by cunningly rearranging the matrix multiplications.

Remember that the content key can be reconstructed from the KV latent:

$$
\mathbf{k}^{C} = W^{UK}\mathbf{c}^{KV}
$$

Now remember from linear algebra class (again), using the associative property of matrix multiplication, the query-key dot product can be rearranged as:

$$
(\mathbf{q}^{C})^\top(W^{UK}\mathbf{c}^{KV})
=
((W^{UK})^\top\mathbf{q}^{C})^\top\mathbf{c}^{KV}
$$

This is exactly why RoPE needed to be decoupled. By keeping the content keys unrotated, their up projection can be *absorbed* into the query computation which allows for attention to be calculated directly with the latents, without reconstructing the full keys. 

I implement this key weight absorption as follows:

```python   
k_con_weights = self.k_con_proj.weight
k_con_weights = k_con_weights.reshape(self.num_heads, self.nope_dim, k_con_weights.shape[-1])

q_absorbed = (q_con.unsqueeze(-2) @ k_con_weights).squeeze(-2)

q_con = q_absorbed.transpose(1, 2)
k_con_t = kv_compressed.transpose(1, 2)
k_con_t = k_con_t.unsqueeze(1)

# absorbed MLA content scores for Q @ K^T
con_scores = q_con @ k_con_t
```

For the positional side of things, these attention scores are computed separately using the rotated queries and cached rotated keys. With both the positional and content scores, these are added together, scaled, causally masked, and passed through a softmax to obtain attention weights.

Another thing is that the **value projection** can be rearranged. Instead of reconstructing every value before calculating the weighted sum, the attention weights are multiplied straight with the compressed latents. Then this result is projected:

```python
# combine shared KV latents using every head's attention weights
weighted_latents = att_weights @ kv_compressed.unsqueeze(1)

# give each head a value proj matrix
v_weights = self.v_proj.weight.reshape(
    self.num_heads, self.value_dim, -1
)
v_weights = v_weights.transpose(-2, -1)

head_outputs = weighted_latents @ v_weights
```

Finally, the head outputs are concatenated and the output projection is used to return to the model's original hidden size.

Thus, MLA is not only useful for compressing KV representations for caching, but also for weight absorption and computing attention with the compressed latents. This results in a smaller KV cache, lesser memory used, and potentially faster inference as sequence length grows in size.

## DeepSeekMoE: Mixture of Experts

Traditionally, LLMs rely on dense feed-forward networks (FFNs), meaning all of its parameters are activated to process inputs. **Mixture of Experts (MoE)** is a different architectural paradigm where a model splits its layers into sub-networks or “experts” that each specialize in different types of inputs, thus only activating a subset of parameters at a time.

DeepSeekMoE is composed of three main things including routed experts, a gating/router component, and shared experts. The **routed experts** are the individual FFNs that are selectively chosen to process input tokens. The **router (gating network)** is a linear layer that decides which experts get which tokens. The **shared expert(s)** are separate FFNs that process every input token regardless of chosen routed experts.

<figure class="blog-figure" data-figure="ds-moe-route">
<div class="live-figure"><canvas aria-label="Tokens pass through one DeepSeekMoE layer one at a time. The shared expert fires for every token, the router scores all 256 routed experts, the top 8 light up, and their outputs join a weighted sum"></canvas></div>
<figcaption>One DeepSeekMoE layer: the shared expert processes every token while the router scores all 256 routed experts with only the top 8 being used.</figcaption>
</figure>

Specifically introduced by DeepSeek, the reason for having a shared expert is to handle common patterns and knowledge across all tokens, while keeping the routed experts for specific representations. 

An intuitive example is having one expert for math, one expert for chemistry, one expert for astronomy, etc. However, in reality, a lot of these domains overlap, and experts aren't explicitly delegated specific subjects. Instead, the model learns how to distribute its tokens and specialize experts during training.

I implement these three main components with routed and shared experts using the SwiGLU FFN introduced earlier:

```python
self.router = nn.Linear(
    in_features=model_conf["hidden_size"],
    out_features=moe_conf["routed_experts"],
    bias=False
)

# list of routed experts
self.routed_experts = nn.ModuleList([
    SwiGLU(
        hidden_size=model_conf["hidden_size"],
        inter_size=moe_conf["routed_expert_inter_size"]
    )
    for _ in range(moe_conf["routed_experts"])
])

self.shared_expert = SwiGLU(
    hidden_size=model_conf["hidden_size"],
    inter_size=moe_conf["shared_expert_inter_size"]
)
```

I use `nn.ModuleList` to hold numerous nn modules with their own respective parameters to create the routed experts. The shared expert is separate since it processes every token without any need for routing.

For every input token, the router first produces a score for every routed expert using a learned linear projection $W_g$ which are the **router weights**. Then, these logits go through a sigmoid to get token-to-expert **affinity scores**

$$
s_{i,t} = \operatorname{Sigmoid}(\mathbf{u}_t^\top \mathbf{e}_i)
$$

where $\mathbf{u}_t$ is the hidden state of token $t$ and $\mathbf{e}_i$ represents the learned router vector for expert $i$.

The router can select the top-$K$ experts per token from these affinity scores, factoring in a bias (discussed in the next subsection). I then take these scores and normalize them into **gating weights** for MoE outputs:

```python
selection_scores = routed_scores + self.router_bias
indices = torch.topk(selection_scores, k=self.experts_per_token, dim=-1).indices

# for each token, retrieve each routed score and corresponding top k experts
expert_weights = routed_scores.gather(dim=-1, index=indices)

# for each token, normalize by dividing each score by sum of scores of top k experts
norm_weights = expert_weights / expert_weights.sum(dim=-1, keepdim=True)
```

I go through each expert, find the tokens routed to it, and pass them through its SwiGLU FFN. Since a token can go through multiple experts, I multiply each expert's output by its gating weight and add them together to get each token's final routed output:

```python
flat_weights = norm_weights.reshape(-1, self.experts_per_token)

for expert_id, routed_expert in enumerate(self.routed_experts):
    tok_indices, selection_slots = torch.where(flat_indices == expert_id)

    # index the specific tokens corresponding to this current expert
    expert_inputs = flat_x[tok_indices]
    expert_outputs = routed_expert(expert_inputs)

    weights = flat_weights[tok_indices, selection_slots]

    # broadcast, for each token, multiply each feature in that token's row by the weight for that row
    weighted_outputs = expert_outputs * weights.unsqueeze(-1)

    accumulated_outputs[tok_indices] += weighted_outputs
```

Here, I use `torch.where` to find tokens delegated to the current expert and their positions or "slots" within the top-$K$ selections.

Finally, I add the shared expert's outputs to the router experts' (accumulated) outputs to get the full output:

```python
routed_output = accumulated_outputs.reshape(batch, tokens, hidden_size)
shared_output = self.shared_expert(x)

full_output = routed_output + shared_output
```

The full MoE output can be fully expressed as

$$
\mathbf{h}'_t = \sum_{i=1}^{N_s} \operatorname{FFN}^{(s)}_i(\mathbf{u}_t)
+ \sum_{i=1}^{N_r} g_{i,t}\operatorname{FFN}^{(r)}_i(\mathbf{u}_t)
$$

where $N_s$ is the number of shared experts, $N_r$ is the number of routed experts, and $g_{i,t}$ are their normalized gating weights.

### Auxiliary-Loss-Free Load Balancing

Training MoE can be difficult due to a known phenomenon called **expert collapse**. This occurs when tokens are being unevenly distributed among experts without any restrictions during training, thus leading to some experts that handle almost all the workload while others sit idly.

Traditionally, an **auxiliary loss** would be introduced to balance the load among experts utilized. However, by incorporating an additional loss term, the training objective now has two potentially conflicting goals, one to optimize for prediction accuracy, and the other to optimize for evenly distributed input tokens.

To avoid this, DeepSeek-V3 introduced an auxiliary-loss-free, load balancing technique that does not use an additional loss term, but instead a heuristic **routing bias** applied to the router scores during the forward pass.

Formally, routing with this bias is defined as

$$
g'_{i,t} =
\begin{cases}
s_{i,t}, & s_{i,t} + b_i \in \operatorname{Top-K}\left(\{s_{j,t} + b_j \mid 1 \leq j \leq N_r\}, K_r\right), \\
0, & \text{otherwise}.
\end{cases}
$$

where $b_i$ is an expert's bias, $s_{i,t}$ is the affinity score between token $t$ and that expert (post-sigmoid), and $K_r$ is the number of selected experts per token. 

The top-$K$ experts are selected using the sum of their affinity scores and respective routing biases:

```python
selection_scores = routed_scores + self.router_bias
```

The bias is dynamically updated each optimizer step based on how many times each expert is used. *Overloaded* experts have their biases decreased and *underloaded* experts have their biases increased:

$$
b_i \leftarrow
\begin{cases}
b_i - \gamma, & \text{if expert } i \text{ is overloaded}, \\
b_i + \gamma, & \text{if expert } i \text{ is underloaded}.
\end{cases}
$$

$\gamma$ is a hyperparameter that controls the bias update speed.

I keep count of how many times each expert is selected (i.e. **expert selection counts**) during training and use their average as the target load:

```python
@torch.no_grad()
def update_router_bias(self):
    # calc target load to balance expert routing of tokens
    target_load = (self.batch_expert_counts.sum() / self.num_routed_experts) 

    self.router_bias.add_(
        self.gamma * torch.sign(target_load - self.batch_expert_counts)
    )

    self.batch_expert_counts.zero_()
```

An important thing to note is that I store the bias using PyTorch's `register_buffer` instead of `nn.Parameter` so it's not included in `model.parameters()`, as it's not updated through gradient descent.

<figure class="blog-figure" data-figure="ds-moe-balance">
<div class="live-figure"><canvas aria-label="Expert loads as bars against an even share, with each expert's bias as a stem. Biases rise for underloaded experts and fall for overloaded ones, and over 60 steps the loads even out"></canvas></div>
<figcaption>16-expert simulation where each expert's bias moves up when it's underloaded and down when it's overloaded, thus effectively changing which experts get picked.</figcaption>
</figure>

An expert that receives more input tokens will now be less likely to be selected as an expert during the next pass. Conversely, underutilized experts will get an increased chance of processing more input tokens. 

### Complementary Sequence-Wise Auxiliary Loss

Even though DeepSeek-V3 mainly uses auxiliary-loss-free load balancing to handle expert imbalance, one limitation is that it looks at expert imbalance holistically throughout the entire training batch. To avoid expert collapse *within* individual sequences, a complementary, **sequence-wise auxiliary loss** is introduced.

Starting off I calculate **expert selection frequencies** based on how often each expert would be selected using the original affinity scores, without the routing bias

$$
f_i = \frac{N_r}{K_r T} \sum_{t=1}^{T} \mathbb{1}\left(i \in \operatorname{Top-K}({s_{j,t}}_{j=1}^{N_r}, K_r)\right)
$$

where $T$ is the sequence length and $\mathbb{1}$ is an *indicator function* returning 1 when expert $i$ is chosen and 0 otherwise.

I then use these frequencies and the normalized affinity scores:

```python
relative_usage = (
    seq_expert_counts * self.num_routed_experts / (tokens * self.experts_per_token)
)

normalized_mean_scores = (routed_scores / routed_scores.sum(dim=-1, keepdim=True)).mean(dim=1)

# higher aux loss means imbalance in expert contributors
aux_loss = self.alpha * (relative_usage * normalized_mean_scores).sum(dim=-1).mean()
```

Unlike the main bias-based load balancing, this term is actively contributing to the training loss. $\alpha$ controls the strength of its regularization.

Interestingly enough, this sounds contradictory to the original motivation for removing auxiliary losses. However it makes sense, because here, a very small auxiliary loss is used to prevent only *extreme* imbalance within sequences, rather than using it as the main load balancing technique.

## Multi-Token Prediction (MTP)

Classically, a transformer is trained to predict the next (single) token at each position. For example, given the sequence "The cat sat on the", the model predicts the next token "mat". **Multi-token prediction (MTP)** is a technique where a model predicts multiple future tokens at each position, rather than exclusively guessing one token $t+1$. 

In DeepSeek-V3, unlike other approaches to MTP that predict future tokens simultaneously using independent prediction heads, future tokens are predicted *sequentially* with **MTP modules**. This might seem counterintuitive, since predicting multiple tokens in parallel sounds more efficient and more "multi". However, this lets the model maintain a causal chain by having each MTP module build on context from previous modules.

Each MTP module takes in two things, one being the hidden representation output of the previous prediction depth for the current input token, and the other being an embedding of the future, ground-truth token. Then, both are normalized with RMSNorm, concatenated, and passed through a linear layer to match the original hidden size. 

This is defined as

$$
\mathbf{h}_{i}^{\prime k} = M_k \left[
\operatorname{RMSNorm}(\mathbf{h}_{i}^{k-1});
\operatorname{RMSNorm}(\operatorname{Emb}(t_{i+k}))
\right]
$$

where $i$ is the token position, $k$ is the prediction depth, $\mathbf{h}_i^{k-1}$ is the hidden representation from the previous stage (or main transformer when $k=1$), and $M_k$ is a learned linear projection. The semicolon means concatenation.

I implement this as follows:

```python
x = self.hidden_norm(x)
next_tok = self.next_tok_norm(next_tok)

# concat features
combined = torch.cat((x, next_tok), dim=-1)

# project back to the model's hidden size
combined = self.combine_proj(combined)
```

The result is then passed into another transformer block to predict the next *future* token. More specifically, while the main model learns to predict token $t+1$ from position $t$, the first MTP module gets both the hidden representation at $t$ and the ground-truth embedding of $t+1$ to predict $t+2$.

<figure class="blog-figure" data-figure="ds-mtp-towers">
<div class="live-figure"><canvas aria-label="The main model reads four tokens and predicts the next token at each position. Its hidden states cross to the MTP module, which combines each with the embedding of the next token, passes it through one transformer block, and predicts one token further through the shared output head. The two losses add, and at inference the module fades away"></canvas></div>
<figcaption>DeepSeek-V3's MTP module and the main model side-by-side. The module concatenates each hidden state with the ground-truth next token's embedding to predict a future token, and is dropped at inference.</figcaption>
</figure>

Notice the emphasis on using the actual, true embedding from the training sequence instead of a predicted token generated by the model. This allows the MTP module to learn future predictions without having to generate any intermediate tokens during training. An intuitive fact to remember is that the number of MTP modules is equal to the number of *additional* predicted tokens.

With each new prediction depth, it introduces its own cross-entropy loss. These are combined using

$$
\mathcal{L}_{\mathrm{MTP}} = \frac{1}{D} \displaystyle\sum\limits_{k=1}^{D}
\mathcal{L}_{\mathrm{MTP}}^{k}
$$

where $D$ is the number of additional prediction depths.

Therefore, MTP doesn't replace the original next-token prediction objective and instead is being used as additional training signal to encourage the model to learn potentially useful future representations.

However, it's important to note that in DeepSeek-V3, MTP modules are used during training and can be discarded during inference, where the main model generates tokens autoregressively as usual.

## Assembling the Architecture

DeepSeek-V3 is decoder-only, like most modern transformers, and consists of 61 transformer blocks. MLA is utilized for attention in each block, but interestingly, the first three blocks use only dense FFNs while the remaining 58 use DeepSeekMoE.

Since all individual components are built, it's time to put them together. But obviously,  I am not building the behemoth of the original 671B parameter model so parts need to be scaled down first.

For my mini implementation, the target is around *200M parameters*. I wanted something small enough to train from scratch on cloud GPUs without high compute spend and training time, but still large enough to produce proper English. Thus, I needed to preserve DeepSeek-V3's architecture but reduce the number of layers, attention heads, experts, and their dimensions.

Here's how the two configurations compare and contrast:

| Configuration | DeepSeek-V3 | Mini DeepSeek-V3 |
|---|---:|---:|
| Transformer layers | 61 | 12 |
| Hidden size | 7,168 | 512 |
| Attention heads | 128 | 8 |
| KV latent size | 512 | 128 |
| Query latent size | 1,536 | 128 |
| Routed experts | 256 | 8 |
| Experts per token | 8 | 2 |
| Shared experts | 1 | 1 |
| Initial dense layers | 3 | 1 |
| MTP modules | 1 | 1 |
| Vocabulary size | 129,280 | 49,152 |

All of these are defined in my `config.yaml`. 

I decided to use the tokenizer from [SmolLM2-135M](https://huggingface.co/HuggingFaceTB/SmolLM2-135M), which has a vocabulary of 49,152 tokens. I chose this over GPT-2's tokenizer since it's from a more recent language model and more relevant to what I'm building.

The resulting mini DeepSeek-V3 has about *199M parameters*, or *212.6M* including MTP.

However, remember that MoE only activates a subset of its routed experts for each token. During inference, around *108.2M parameters are active per token* because each MoE layer only selects the top 2 of its 8 routed experts alongside the shared expert.

MLA's KV cache is also smaller at this scale. Without MLA, storing keys and values for 8 heads, with 96 key dimensions (64 content + 32 positional) and 64 value dimensions, would need 1,280 numbers for every token per layer. My compressed KV latent and rotary key only require 160 (128 + 32), making the cache *8 times smaller*. For comparison, the original DeepSeek-V3 reduces this from 32,768 to 576 numbers, or about 57 times.

Now, let's implement one DeepSeek transformer block. The structure is relatively straightforward being RMSNorm → MLA → residual connection then RMSNorm → FFN → residual connection afterwards. Residual connections help preserve information and gradient flow. The main difference between these blocks is whether they use a dense SwiGLU FFN or a DeepSeekMoE layer.

In my implementation, I simply use the layer index to decide which one gets used:

```python
self.is_dense = layer_idx < model_conf["num_dense_layers"]

self.layer_norm_1 = RMSNorm(hidden_size=model_conf["hidden_size"], epsilon=rms_conf["epsilon"])

self.mha = MLA(config)

self.layer_norm_2 = RMSNorm(hidden_size=model_conf["hidden_size"], epsilon=rms_conf["epsilon"])

if self.is_dense:
    self.mlp = SwiGLU(hidden_size=model_conf["hidden_size"], inter_size=model_conf["dense_inter_size"])
else:
    self.mlp = MoE(config)
```

And since I set `num_dense_layers` to 1, the first block is the only dense FFN while the remaining 11 employ MoE.

Now by putting everything together, the forward pass of a DeepSeek block looks like this:

```python
def forward(self, x, use_cache=False):
    # residual skip connection
    x = x + self.mha(self.layer_norm_1(x), use_cache=use_cache)

    if self.is_dense:
        # use dense swiglu mlp
        output = self.mlp(self.layer_norm_2(x))
        aux_loss = x.new_zeros(())
    else:
        # use moe
        output, aux_loss = self.mlp(self.layer_norm_2(x))

    # residual skip connection
    x = x + output

    return x, aux_loss
```

It's important to note that MoE blocks also output the complementary auxiliary loss as discussed earlier which is later added to the loss.

With `DeepSeekBlock` built, each block is stacked together to construct the full transformer.

```python
self.deepseek_blocks = nn.ModuleList([
    DeepSeekBlock(config=config, layer_idx=i)
    for i in range(model_conf["num_layers"])
])
```

Everything around this is standard transformer architecture, with token embeddings, a final RMSNorm, and an LM head for next-token prediction.

Then, I attach the **MTP module** introduced before:

```python
# multi-token prediction module
self.mtp = MTP(
    config=config,
    block=DeepSeekBlock(config=config, layer_idx=model_conf["num_dense_layers"])
)
```

I only use one additional module, which means one extra future token is predicted during training. This module contains its own DeepSeek block, also using MoE instead of a dense FFN.

Here's how I pass the main transformer's output hidden representations and the ground-truth next-token embeddings into MTP:

```python
# pair each hidden state with next token's embedding
mtp_hidden, mtp_aux_loss = self.mtp(x[:, :-1, :], tok_embeddings[:, 1:, :])

# use shared output layers for mtp predictions
mtp_logits = self.lm_head(self.final_norm(mtp_hidden))
total_aux_loss = total_aux_loss + mtp_aux_loss
```

To be clear, MTP *reuses* the main model's last RMSNorm and LM head instead of creating another different output projection.

<figure class="blog-figure" data-figure="ds-mini-stack">
<div class="live-figure"><canvas aria-label="Mini DeepSeek-V3 stacks up to scale: an embedding table, one dense block, eleven MoE blocks that each hold a shared expert and eight routed experts, an LM head and the MTP module, 212.6 million parameters in all. Then a token passes through and the parts it uses turn blue, two routed experts in each MoE block, 108.2 million parameters"></canvas></div>
<figcaption>Mini DeepSeek-V3 drawn to scale where one square is one routed expert (1.4M parameters).</figcaption>
</figure>

Finally, all of the components, layers, and blocks are all assembled into a complete, trainable mini DeepSeek-V3.

## Training the Model

With the full architecture done, I trained mini DeepSeek-V3 in two parts including **pretraining** on general text to learn language patterns and then **post-training** by SFT on conversational data to teach the model on how to follow human instructions.

### Pretraining

For pretraining, I used the [FineWeb-Edu](https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu) dataset, specifically the `sample-10BT` subset containing 10 billion tokens of educational web text that is optimized for language model training.

I reused the SmolLM2-135M tokenizer mentioned earlier but randomly initialized all of my model's weights from scratch. Also, I used Hugging Face's [DataTrove](https://github.com/huggingface/datatrove) for data preprocessing and tokenizing the dataset into shards.

For compute, I rented a single NVIDIA H200 GPU on [Modal](https://modal.com/). I also used BF16 mixed precision, the AdamW optimizer, and warmup-stable-decay (WSD) as the learning rate schedule.

Here are the hyperparameters I configured:

| Hyperparameter | Value |
|---|---|
| Sequence length | 2,048 |
| Batch size | 16 |
| Gradient accumulation | 8 |
| Effective batch size | 128 sequences |
| Peak learning rate | $3 \times 10^{-4}$ |
| Minimum learning rate | $3 \times 10^{-5}$ |
| Warmup steps | 500 |
| Decay start | Step 30,000 |
| Total training steps | 38,147 |
| MTP loss weight | 0.3 |

Since we used both MTP and the complementary auxiliary loss from MoE, the total training objective has three parts which include

$$
\mathcal{L}_{\mathrm{total}} =
\mathcal{L}_{\mathrm{NTP}} +
\mathcal{L}_{\mathrm{Aux}} +
\lambda\mathcal{L}_{\mathrm{MTP}}
$$

where $\mathcal{L}_{\mathrm{NTP}}$ is the next-token prediction loss, $\mathcal{L}_{\mathrm{Aux}}$ is the complementary expert-balancing loss, and $\lambda$ is a controller for MTP loss contribution.

I use PyTorch's `cross_entropy` function to compute the losses as such:

```python
prediction_loss = F.cross_entropy(
    logits.reshape(-1, logits.size(-1)),
    targets.reshape(-1)
)

mtp_loss = F.cross_entropy(
    mtp_logits.reshape(-1, mtp_logits.size(-1)),
    targets[:, 1:].reshape(-1)
)

loss = (prediction_loss + aux_loss + training_conf["mtp_loss_weight"] * mtp_loss)
```

The WSD schedule increases the learning rate for the first 500 steps and holds it until step 30,000. Then, this decays for the remainder of training. I also use gradient accumulation and clipping, and update the MoE routing biases after every optimizer step.

In terms of results, the full pretraining run went through 10 billion tokens over 38,147 optimizer steps (which is 1 epoch), taking *23 hours and 4 minutes*.

As shown below, the training loss dropped from 10.98 to less than 4 after the first billion tokens. Validation loss had eventually reached 3.03 with the final 0.11 improvement occurring during the learning rate decay.

<figure class="blog-figure" data-figure="ds-train-loss">
<div class="live-figure"><canvas aria-label="The training loss falls from 10.98 to under 4 within the first billion tokens, then the view widens to all 10 billion, where validation loss ends at 3.03 and the multi-token prediction loss at 3.32, with the learning rate drawn underneath"></canvas></div>
<figcaption>Pretraining loss over 10 billion tokens, showing training loss, validation loss, MTP loss, and the learning rate schedule.</figcaption>
</figure>

The full training summary:

| Metric | Result |
|---|---:|
| Total tokens processed | 10,000,007,168 |
| Final prediction loss | 3.0461 |
| Best validation loss | 3.0285 |
| Final MTP loss | 3.3189 |
| Final auxiliary loss | 0.001234 |
| Average training throughput | 123,622 tokens/sec |
| Peak allocated GPU memory | 48.28 GiB |
| Total time | 23h 04m |

### Post-Training

While the pretrained model can generate text, that doesn't necessarily mean it knows how to follow instructions or hold an actual conversation.

For post-training, I decided to use [Smol-SmolTalk](https://huggingface.co/datasets/HuggingFaceTB/smol-smoltalk), a dataset containing conversational instruction-response examples.

I loaded the best checkpoint from pretraining with a fresh optimizer, schedule, and step count. Also, I modified the data processing pipeline to account for chat-formatted conversations.

For SFT, I kept mostly the same training hyperparameters but shortened the WSD schedule, reducing warmup from 500 to 100 steps, starting decay at step 500 instead of 30,000, and training for 3,124 steps (which is 2 epochs) instead of 38,147. I also used an NVIDIA H100 80GB GPU which was what was available.

This time, training took *1 hour and 37 minutes* processing approximately 818.9 million tokens over 3,124 optimizer steps.

The prediction loss dropped from 2.98 to 1.43 with most of the improvement coming from the first 400 steps. Validation loss decreased from 1.85 at step 250 to 1.55 at the final step. During the second pass, the training loss dipped below the validation loss.

<figure class="blog-figure" data-figure="ds-sft-loss">
<div class="live-figure"><canvas aria-label="The fine-tuning loss falls from 2.98 to about 1.8 within the first 400 steps, then the view widens to all 3,124 steps: validation loss ends at 1.55, the training loss dips below it during the second pass over the data, and the learning rate is drawn underneath"></canvas></div>
<figcaption>Supervised fine-tuning over two passes of Smol-SmolTalk, showing training loss, validation loss, and the learning rate schedule.</figcaption>
</figure>

The final SFT results:

| Metric | Result |
|---|---:|
| Total tokens processed | 818,905,088 |
| Final prediction loss | 1.4335 |
| Best validation loss | 1.5535 |
| Final MTP loss | 1.6899 |
| Final auxiliary loss | 0.001241 |
| Average training throughput | 149,249 tokens/sec |
| Peak allocated GPU memory | 51.37 GiB |
| Total time | 1h 37m |

It's clear that both stages showed model learning from consistent decrease in validation loss. But of course, seeing the loss decrease doesn't tell us whether or not the model can actually have a quality conversation. So, let's see how well it does when we start prompting it.

## Results

After training, I tested Mini DeepSeek-V3's text generation capabilities to see if it can follow human instructions.

For inference, I used MLA's compressed KV cache with a temperature and top-k sampling. Since I noticed that the model would sometimes repeat words or entire sentences (even after SFT), I added a repetition penalty:

```python
# lower the scores of recent used tokens so model stops looping on them
recent = tok_ids[:, -penalty_window:]
recent_logits = next_logits.gather(dim=-1, index=recent)

recent_logits = torch.where(
    recent_logits > 0,
    recent_logits / repetition_penalty,
    recent_logits * repetition_penalty
)

next_logits = next_logits.scatter(dim=-1, index=recent, src=recent_logits)
```

Simply, this just reduces the probability of generating tokens that were already used before.

For evaluation, I compared between the pretrained and fine-tuned models. I did this through *12 factual questions, 9 basic instructions, and 6 short conversations*, generating 20 samples for every prompt. I used the same prompts, random seeds, and sampling settings (temperature 0.7, top-k 40, and repetition penalty 1.1) for each model. The pretrained model received plain-text prompts while the fine-tuned model used the chat format it was trained on.

Here are three examples from the comparison:

<figure class="blog-figure">
<table class="compare-table">
<thead><tr><th>Prompt</th><th>Pretrained</th><th>After SFT</th></tr></thead>
<tbody>
<tr><td>What is the capital of France?</td><td data-label="Pretrained">The French name for the province of the same name is Le Havre. The capital city of the province is Père-Léon.<br>What is the capital of France?<br>The city of Paris is one of the most important cities in Europe with around 70,00 <span class="cut">…</span></td><td data-label="After SFT">The capital of France is Paris. It is a city known for its historical landmarks, museums, and cultural institutions. The city is also home to several iconic landmarks such as the Eiffel Tower, Louvre Museum, Notre-Dame Cathedral, and Notre-Dame Cathedral. Paris has many charming <span class="cut">…</span></td></tr>
<tr><td>Write one sentence about dogs.</td><td data-label="Pretrained">In this example, we are going to show you how to write a simple sentence using only words.<br>Writing a sentence using words is a very easy task for everyone who is interested in writing a simple sentence. We will show you how to do it with the help of examples. And when you <span class="cut">…</span></td><td data-label="After SFT">Dogs are known for their playful nature, and their owners often tell them that they're a wonderful companion.</td></tr>
<tr><td><span class="turn"><span class="who">User:</span> Hi, my name is Sam.</span><span class="turn"><span class="who">Assistant:</span> Hello Sam! How can I help you today?</span><span class="turn"><span class="who">User:</span> What is my name?</span></td><td data-label="Pretrained">I am an engineer. The name of my instructor (I have 3 students) is Mr. X.<br>The first two questions are asking for the purpose of a discussion between your instructor and students.<br>In this case, let me ask for the purpose of a discussion.<br>Your classmates will <span class="cut">…</span></td><td data-label="After SFT">My name is Emily. Thank you for reaching out, and I hope you find your way to our house.</td></tr>
</tbody>
</table>
<figcaption>Pretrained vs. fine-tuned responses to the same prompts. Outputs are cut off at 60 tokens unless the model had stopped earlier.</figcaption>
</figure>

Off the bat, I observed that pretraining had already produced decently fluent English text, but the model would usually continue a prompt instead of answering it like a Q&A. For instance, out of 240 factual question samples, 216 started on a new line, 58 asked another question, and 0 stopped within 40 tokens. This somewhat makes sense considering that it was trained on educational web text.

The SFT model was much better at receiving and following instructions. "List three fruits" returned actual numbered lists in all 20 samples, and "Write one sentence about dogs" gave back only a single sentence about 2/3 of the time. Although, it still struggled when given exact constraints. Only 3/20 fruit lists stopped at three items, it couldn't count from 1 to 5, and it couldn't respond in just one word. Sadly though, it also fails the "How many R's are in strawberry?" test.

Factual accuracy was another thing. Out of 240 responses across the 12 questions, the pretrained model answered 33 correctly and the SFT model got 78 correct. There were more correct answers about capital cities, with France answered correctly 20/20 times, Japan 18/20, and Italy 14/20 after SFT. Even so, the model couldn't do basic arithmetic, getting $2+2$ correctly 3/20 times and the number of days in a week 2/20 times. In one test, it had even claimed that a spider has 1 leg.

<figure class="blog-figure" data-figure="ds-fact-dots">
<div class="live-figure"><canvas aria-label="Twelve questions with twenty replies each. The pretrained model answers 33 of 240 correctly and the fine-tuned model 78 of 240, and most of the right answers are the three capitals"></canvas></div>
<figcaption>Twelve simple factual questions, with 20 replies each from the pretrained and fine-tuned checkpoints. A blue dot is a correct answer.</figcaption>
</figure>

I also measured repetition and stopping behavior using 8 prompts, 4 samples per temperature, and a limit of 200 tokens:

| | T = 0.3 | T = 0.7 | T = 1.0 |
|---|---:|---:|---:|
| Pretrained, repeats a sentence | 81% | 12% | 0% |
| Fine-tuned, repeats a sentence | 6% | 0% | 0% |
| Pretrained, stops on its own | 19% | 22% | 19% |
| Fine-tuned, stops on its own | 50% | 53% | 38% |

SFT had reduced repetition considerably, although the model still tends to create unnecessarily long  and wordy responses. Given a 400-token limit, it stopped on its own in 94–97% of runs with the median response being around 215 tokens. Interestingly enough, the median reply length in Smol-SmolTalk is around 285 tokens.

For multi-turn conversations, the model could sometimes recall information from earlier messages, but it often confused the user's information with its own. Out of the 151 responses that remembered a fact, 81 talked as if it belonged to the model, while only 23 correctly referred to the user. When asked "What is my name?", 37/40 responses started off with "My name is..." instead of using the user's name.

One trade-off of scaling down DeepSeek-V3 is that my model activates a whopping 54% of its main-model parameters per token, compared to just 5.5% in the original. This means that much of MoE's parameter sparsity was arguably lost at this scale. However, expert routing didn't show any signs of collapse. Across approximately 12,000–13,000 tokens of demo text from each checkpoint, all 88 routed experts were used, with individual selection rates ranging from 12% to 33%, compared with 25% for perfectly balanced routing.

A lot of these limitations could be improved upon with more pretraining data, longer training runs, and better post-training techniques. However, the model's small parameter count also limits its learning capabilities. A next step would be to conduct ablations, such as removing MTP or replacing MLA with standard attention. With this, I could determine specific improvements that came from specific DeepSeek components.

But ultimately, to reiterate, my goal was to understand and implement DeepSeek-V3's architecture from scratch. Training it was only a secondary goal to see whether it could actually learn to generate coherent English and follow basic instructions at a much smaller scale, rather than building a highly intelligent model. As such, I think the project was very successful.

## Demo

Here's the fully trained model, tested using a few prompts. It's not live but instead recorded outputs for every combination of configuration settings, with two samples each to account for stochasticity.

The responses are not cherry-picked. The random seed was fixed before generating, and every sample was recorded as it came out. Thus, each recorded response is replayed deterministically with its specific configurations.

<figure class="blog-figure">
<div class="model-demo" data-model-demo="/assets/blog/deepseek-v3-from-scratch/demo.json"></div>
<figcaption>Recorded outputs from mini DeepSeek-V3, replayed at about the speed it generates on my laptop. Words that are cut off are shown in grey.</figcaption>
</figure>

The code for this project is on [GitHub](https://github.com/willcagas/mini-deepseek), and the fine-tuned weights are on [Hugging Face](https://huggingface.co/willcagas/mini-deepseek-v3) if you want to run the model yourself.

Keep in mind, the model doesn't pass the strawberry test in the big 2026 though.

I genuinely had a lot of fun learning, coding, and writing about DeepSeek-V3 and its innovative architecture. I hope you had fun reading and learned a thing or two! If you have any questions or just want to chat, always feel free to reach out and let me know what you think.

<!-- Decisions log: write each one down right after making it, polish later.
     YYYY-MM-DD · component · what I decided · why · what I tried first
-->
