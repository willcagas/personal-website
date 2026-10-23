---
title: "Medical Imaging Complexity and its Effects on GAN Performance"
date: "2024-12-12"
slug: "medical-imaging-complexity"
summary: "GAISynMeD @ ACCV 2024 (oral presentation); cited 14x including ICCV, ACM."
venue: "GAISynMeD @ ACCV 2024"
authors: "William Cagas, Chan Ko, Blake Hsiao, Shryuk Grandhi, Rishi Bhattacharya, Michael Lam, Kevin Zhu"
---

Published at the [GAISynMeD Workshop](https://sites.google.com/view/gaisynmed/home?authuser=0) at [ACCV 2024](https://x.com/ACCVConf) in Hanoi, Vietnam.

[Paper](https://openaccess.thecvf.com/content/ACCV2024W/GAISynMeD/papers/Cagas_Medical_Imaging_Complexity_and_its_Effects_on_GAN_Performance_ACCVW_2024_paper.pdf) · [arXiv](https://arxiv.org/abs/2410.17959) · [Code](https://github.com/willcagas/Synthetic-Medical-Image-Generation)

<figure class="blog-figure">
<img src="/assets/writings/medgans/synthesized-images.png" alt="Comparison of original medical images and synthetic images from StyleGAN 3 and SPADE-GAN across skin lesions, chest X-rays, and colon polyps at varying training set sizes" loading="lazy" />
<figcaption>Original vs. synthetic images from StyleGAN 3 and SPADE-GAN across dermoscopic skin lesions, chest X-rays, and colon polyps, for training sets of different sizes.</figcaption>
</figure>

### TL;DR

We empirically show that increased complexity in medical imaging data reduces GAN performance when generating realistic medical images, and that this relationship can guide efficient GAN training for high-fidelity synthetic data in clinical settings.

### Problem

Machine learning in clinical applications needs high-quality medical data, which is often scarce because of privacy, wet-lab cost, and annotation cost. Generative adversarial networks (GANs) can synthesize medical images, but the training-set sizes needed for high-fidelity results are not well characterized. Most prior work emphasizes architecture changes and underplays data-centric choices.

### Approach

We study a data-centric view of efficient GAN training for medical synthesis with StyleGAN 3 and SPADE-GAN: relate each dataset's **image complexity distribution** to variable training-set sizes and the fidelity of the resulting synthetics.

### Measuring image complexity

Image complexity is the variety of features and detail in an image. Classical entropy captures uncertainty in grayscale intensity histograms, but we use Larkin's **delentropy**, built on a joint density (deledensity) over local derivatives:

$$p(i,j) = \frac{1}{4WH}\sum_{w=0}^{W-1}\sum_{h=0}^{H-1}\delta_{i,d_x}(w,h)\,\delta_{j,d_y}(w,h),$$

where $d_x$ and $d_y$ are derivative kernels, $\delta$ bins the histogram, and $H$, $W$ are image height and width. Delentropy is then

$$DE = -\frac{1}{2}\sum_{i=0}^{I-1}\sum_{j=0}^{J-1}p(i,j)\log_b p(i,j).$$

Higher delentropy means richer structure (more complex); lower delentropy means simpler structure.

### Pipeline

We ask how training-set size affects StyleGAN 3 and SPADE-GAN fidelity, relative to each dataset's delentropy distribution.

**Preprocessing.** Images are resized to $512\times 512$. SPADE-GAN needs segmentation masks; we use existing annotations or masks from TorchXRayVision where needed.

**Training.** Official StyleGAN 3 and SPADE-GAN implementations, default hyperparameters, no architectural augmentations. For each run we sample training sets of 500, 1000, and 2500 images, then generate synthetics.

**Evaluation.** Fréchet Inception Distance (FID); lower is better (closer to the real distribution).

<figure class="blog-figure">
<img src="/assets/writings/medgans/fid-scores.png" alt="FID curves for StyleGAN 3 and SPADE-GAN across medical datasets at 500, 1000, and 2500 training images" loading="lazy" />
<figcaption>FID vs. training-set size for StyleGAN 3 and SPADE-GAN on each medical dataset. Lower FID means higher fidelity.</figcaption>
</figure>

### Results

FID falls as training-set size grows. StyleGAN 3 trained on 2500 images cut FID by about 48% vs. 500 images on average; SPADE-GAN by about 31%. SPADE-GAN beat StyleGAN 3 across datasets and sizes (about 33% lower FID on average), consistent with mask conditioning supplying structure that StyleGAN 3 must learn from pixels alone.

<figure class="blog-figure">
<img src="/assets/writings/medgans/delentropy.png" alt="Delentropy distributions for skin lesion, chest X-ray, and polyp datasets" loading="lazy" />
<figcaption>Delentropy distributions per dataset. Higher mean delentropy $\mu$ indicates a more complex image set.</figcaption>
</figure>

Chest X-rays (more homogeneous, lower complexity) give the lowest FID. Polyps (wider, more complex) give the highest. That is the inverse relationship we care about: as the spread of image complexities grows, GAN performance tends to degrade.

SPADE-GAN's FID curves are smoother and largely non-overlapping; gains plateau after about 1000 images with little further perceptual improvement. StyleGAN 3 keeps improving between 500 and 2500. These curves are useful benchmarks for datasets with similar delentropy profiles.

### Limitations

Training sizes were limited to 500 / 1000 / 2500, so the curves are coarse. FID is the sole metric and may not track downstream clinical utility. Extending the study to VAEs, autoregressive models, and diffusion models would strengthen the picture.

### Contributions

1. Empirically link higher image complexity to worse GAN image fidelity on these medical datasets.
2. Show that, for a similar delentropy profile, practitioners can use the nearest fidelity curve as a rough guide to training-set size for a target fidelity.
3. Argue for data-centric complexity measures as a training guide; fuller experiments are still needed.

### BibTeX

```bibtex
@InProceedings{Cagas_2024_ACCV,
    author    = {Cagas, William and Ko, Chan and Hsiao, Blake and Grandhi, Shryuk and Bhattacharya, Rishi and Zhu, Kevin and Lam, Michael},
    title     = {Medical Imaging Complexity and its Effects on GAN Performance},
    booktitle = {Proceedings of the Asian Conference on Computer Vision (ACCV) Workshops},
    month     = {December},
    year      = {2024},
    pages     = {207-217}
}
```
