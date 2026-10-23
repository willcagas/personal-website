const ARCHIVE_DATA = {
  photos: [
    {
      image: "/assets/pictures/darwin-office-setup.jpg",
      caption: "Desk setup at Darwin office in SF"
    },
    {
      image: "/assets/pictures/browser-use-hackathon.jpg",
      caption: "Browser Use x Y Combinator hackathon in SF"
    },
    {
      image: "/assets/pictures/watai-kickoff.jpeg",
      caption: "WAT.ai Kickoff Meeting for EPA Consultant Team"
    },
    {
      image: "/assets/pictures/uw-zfellows-meetup.jpeg",
      caption: "UW x Z Fellows builder meetup"
    },
    {
      image: "/assets/pictures/goosetrials-launch.jpg",
      caption: "Goose Trials launch at SE lounge",
      objectPosition: "60% 40%"
    },
    {
      image: "/assets/pictures/se-2030.JPG",
      caption: "Most cracked builders in Canada (i.e. Waterloo SE '30)",
      objectPosition: "0% 100%"
    },
    {
      image: "/assets/pictures/bts-news.jpg",
      caption: "Behind-the-scenes Global News interview ft. my family",
      objectPosition: "0% 40%"
    },
    {
      image: "/assets/pictures/sf-2025.jpg",
      caption: "Hack Club's Undercity hackathon at GitHub HQ in SF"
    },
    {
      image: "/assets/pictures/loo-park.jpg",
      caption: "Views from Waterloo Park, Waterloo, Canada"
    },
    {
      image: "/assets/pictures/dev-the-future.JPG",
      caption: "Panelist at the semiannual Apple x DevTheFuture conference",
      objectPosition: "70% 40%"
    },
    {
      image: "/assets/pictures/accv.jpg",
      caption: "Presenting research at ACCV 2024 in Hanoi, Vietnam"
    },
    {
      image: "/assets/pictures/hammerhacks.JPEG",
      caption: "Organizing team for HammerHacks, Hamilton's first high school hackathon"
    },
    {
      image: "/assets/pictures/code-in-place.jpg",
      caption: "First class teaching for Stanford Code in Place"
    },
    {
      image: "/assets/pictures/robotics.jpg",
      caption: "Winners of the FRC Ontario District Niagara College Event",
      objectPosition: "40% 40%"
    }
  ],
  // Letterboxd-style poster rows, one per group
  favourites: [
    {
      title: "Shows",
      items: [
        {
          title: "Game of Thrones",
          poster: "/assets/shows/game-of-thrones.jpg",
          url: "https://www.imdb.com/title/tt0944947/"
        },
        {
          title: "Black Mirror",
          poster: "/assets/shows/black-mirror.jpg",
          url: "https://www.imdb.com/title/tt2085059/"
        },
        {
          title: "Sherlock",
          poster: "/assets/shows/sherlock.jpg",
          url: "https://www.imdb.com/title/tt1475582/"
        },
        {
          title: "Silo",
          poster: "/assets/shows/silo.jpg",
          url: "https://www.imdb.com/title/tt14688458/"
        }
      ]
    },
    {
      title: "Movies",
      items: [
        {
          title: "Interstellar",
          poster: "/assets/movies/interstellar.jpg",
          url: "https://letterboxd.com/film/interstellar/"
        },
        {
          title: "Weathering with You",
          poster: "/assets/movies/weathering-with-you.jpg",
          url: "https://letterboxd.com/film/weathering-with-you/"
        },
        {
          title: "The Mummy",
          poster: "/assets/movies/the-mummy.jpg",
          url: "https://letterboxd.com/film/the-mummy-1999/"
        },
        {
          title: "Dune: Part Two",
          poster: "/assets/movies/dune-part-two.jpg",
          url: "https://letterboxd.com/film/dune-part-two/"
        }
      ]
    },
    {
      title: "Books",
      items: [
        {
          title: "The Dark Forest",
          poster: "/assets/books/the-dark-forest.jpg",
          url: "https://www.goodreads.com/book/show/23168817-the-dark-forest"
        },
        {
          title: "Zero to One",
          poster: "/assets/books/zero-to-one.jpg",
          url: "https://www.goodreads.com/book/show/18050143-zero-to-one"
        },
        {
          title: "The Great Gatsby",
          poster: "/assets/books/the-great-gatsby.jpg",
          url: "https://www.goodreads.com/book/show/41733839-the-great-gatsby"
        },
        {
          title: "Arsène Lupin, Gentleman-Thief",
          poster: "/assets/books/arsene-lupin.jpg",
          url: "https://www.goodreads.com/book/show/141270.Ars_ne_Lupin_Gentleman_Thief"
        }
      ]
    },
    {
      title: "Music",
      shape: "square", // album art
      items: [
        {
          title: "Sicilienne",
          subtitle: "Gabriel Fauré",
          poster: "/assets/music/sicilienne.jpg",
          url: "https://open.spotify.com/track/45KoohfVJ1KkwazDTWNyuN"
        },
        {
          title: "Amber",
          subtitle: "311",
          poster: "/assets/music/amber.jpg",
          url: "https://open.spotify.com/track/6Fe3Flc9SjE03pqwD6PVQl"
        },
        {
          title: "Dreams",
          subtitle: "Fleetwood Mac",
          poster: "/assets/music/dreams.jpg",
          url: "https://open.spotify.com/track/0ofHAoxe9vBkTCp2UQIavz"
        },
        {
          title: "Pyramids",
          subtitle: "Frank Ocean",
          poster: "/assets/music/pyramids.jpg",
          url: "https://open.spotify.com/track/4QhWbupniDd44EDtnh2bFJ"
        },
        {
          title: "(Only) About Love",
          subtitle: "grentperez",
          poster: "/assets/music/only-about-love.jpg",
          url: "https://open.spotify.com/track/0T3pyPYtHAsxIRymAZsTkX"
        }
      ]
    }
  ],
  videos: [
    {
      title: "Global News Interview",
      type: "iframe",
      embedSrc: "https://globalnews.ca/video/embed/11330376/",
      caption: "Global News interview about AcneCura"
    },
    {
      title: "HammerHacks Recap",
      type: "youtube",
      videoId: "Jb-2RpDonEs",
      caption: "HammerHacks recap video"
    }
  ]
};

export default ARCHIVE_DATA;
