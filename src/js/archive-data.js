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
          title: "Arrival",
          poster: "/assets/movies/arrival.jpg",
          url: "https://letterboxd.com/film/arrival-2016/"
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
          title: "Arsène Lupin",
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
          title: "Amber",
          subtitle: "311",
          poster: "/assets/music/amber.jpg",
          url: "https://open.spotify.com/track/6Fe3Flc9SjE03pqwD6PVQl"
        },
        {
          title: "Softcore",
          subtitle: "The Neighbourhood",
          poster: "/assets/music/softcore.jpg",
          url: "https://open.spotify.com/track/2K7xn816oNHJZ0aVqdQsha"
        },
        {
          title: "Pyramids",
          subtitle: "Frank Ocean",
          poster: "/assets/music/pyramids.jpg",
          url: "https://open.spotify.com/track/4QhWbupniDd44EDtnh2bFJ"
        },
        {
          title: "Exit Music (For a Film)",
          subtitle: "Radiohead",
          poster: "/assets/music/exit-music.jpg",
          url: "https://open.spotify.com/track/0z1o5L7HJx562xZSATcIpY"
        }
      ]
    }
  ],
  videos: [
    {
      title: "Global News Interview",
      type: "iframe",
      embedSrc: "https://globalnews.ca/video/embed/11330376/",
      caption: "Global News interview about AcneCura",
      thumbnail: "/assets/press/global-news.jpg"
    },
    {
      title: "HammerHacks Recap",
      type: "youtube",
      videoId: "Jb-2RpDonEs",
      caption: "HammerHacks recap video",
      thumbnail: "/assets/videos/hammerhacks-recap.jpg"
    }
  ],
  // Places I've been, by country. `home` marks the home region; `map` is the
  // country's name in the map data when it differs (Vatican City is too small to be in it).
  places: [
    {
      country: "Canada",
      continent: "North America",
      home: true,
      cities: [
        { name: "Hamilton", lat: 43.2557, lon: -79.8711 },
        { name: "Waterloo", lat: 43.4643, lon: -80.5204 },
        { name: "Toronto", lat: 43.6532, lon: -79.3832 }
      ]
    },
    {
      country: "United States",
      map: "United States of America",
      continent: "North America",
      cities: [
        { name: "New York City", lat: 40.7128, lon: -74.006 },
        { name: "Buffalo", lat: 42.8864, lon: -78.8784 },
        { name: "Pittsburgh", lat: 40.4406, lon: -79.9959 },
        { name: "Chicago", lat: 41.8781, lon: -87.6298 },
        { name: "Orlando", lat: 28.5384, lon: -81.3789 },
        { name: "Las Vegas", lat: 36.1699, lon: -115.1398 },
        { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
        { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
        { name: "Honolulu", lat: 21.3069, lon: -157.8583 }
      ]
    },
    {
      country: "United Kingdom",
      continent: "Europe",
      cities: [{ name: "London", lat: 51.5074, lon: -0.1278 }]
    },
    {
      country: "France",
      continent: "Europe",
      cities: [{ name: "Paris", lat: 48.8566, lon: 2.3522 }]
    },
    {
      country: "Italy",
      continent: "Europe",
      cities: [
        { name: "Rome", lat: 41.9028, lon: 12.4964 },
        { name: "Florence", lat: 43.7696, lon: 11.2558 },
        { name: "Pisa", lat: 43.7228, lon: 10.4017 },
        { name: "Venice", lat: 45.4408, lon: 12.3155 },
        { name: "Milan", lat: 45.4642, lon: 9.19 }
      ]
    },
    {
      country: "Vatican City",
      continent: "Europe",
      cities: [{ name: "Vatican City", lat: 41.9029, lon: 12.4534 }]
    },
    {
      country: "Japan",
      continent: "Asia",
      cities: [{ name: "Narita", lat: 35.7765, lon: 140.3189 }]
    },
    {
      country: "South Korea",
      continent: "Asia",
      cities: [{ name: "Seoul", lat: 37.5665, lon: 126.978 }]
    },
    {
      country: "Philippines",
      continent: "Asia",
      cities: [
        { name: "Manila", lat: 14.5995, lon: 120.9842 },
        { name: "Cebu", lat: 10.3157, lon: 123.8854 },
        { name: "Surigao", lat: 9.7843, lon: 125.4888 },
        { name: "Siargao", lat: 9.8482, lon: 126.0458 }
      ]
    },
    {
      country: "Vietnam",
      continent: "Asia",
      cities: [{ name: "Hanoi", lat: 21.0278, lon: 105.8342 }]
    }
  ]
};

export default ARCHIVE_DATA;
