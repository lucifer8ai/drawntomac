// Seed config: manually curated artist list across 11 buckets
// Each artist is tagged with language and genre for the seed import

export interface SeedArtist {
  name: string;
  mbid?: string; // pre-resolved MBID (avoids one API call)
  seedLanguage: string[];
  seedGenre: string;
  bucket: string;
}

export const SEED_BUCKETS: { name: string; language: string; artists: SeedArtist[] }[] = [
  {
    name: "Bollywood Golden Era",
    language: "Hindi",
    artists: [
      { name: "Lata Mangeshkar", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Kishore Kumar", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Asha Bhosle", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Mohammed Rafi", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Mukesh", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Manna Dey", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Geeta Dutt", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "Hemant Kumar", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-golden" },
      { name: "R. D. Burman", seedLanguage: ["Hindi"], seedGenre: "composer", bucket: "bollywood-golden" },
      { name: "S. D. Burman", seedLanguage: ["Hindi"], seedGenre: "composer", bucket: "bollywood-golden" },
    ],
  },
  {
    name: "Bollywood 90s-2000s",
    language: "Hindi",
    artists: [
      { name: "A. R. Rahman", seedLanguage: ["Hindi", "Tamil"], seedGenre: "composer", bucket: "bollywood-90s" },
      { name: "Alka Yagnik", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Udit Narayan", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Sonu Nigam", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Shreya Ghoshal", seedLanguage: ["Hindi", "Telugu", "Tamil"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "KK", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Sunidhi Chauhan", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Shaan", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Kailash Kher", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
      { name: "Shankar Mahadevan", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-90s" },
    ],
  },
  {
    name: "Bollywood 2010s-2020s",
    language: "Hindi",
    artists: [
      { name: "Arijit Singh", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-modern" },
      { name: "Pritam", seedLanguage: ["Hindi"], seedGenre: "composer", bucket: "bollywood-modern" },
      { name: "Amit Trivedi", seedLanguage: ["Hindi"], seedGenre: "composer", bucket: "bollywood-modern" },
      { name: "Sachin-Jigar", seedLanguage: ["Hindi"], seedGenre: "composer", bucket: "bollywood-modern" },
      { name: "Vishal Dadlani", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-modern" },
      { name: "Neeti Mohan", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-modern" },
      { name: "Jubin Nautiyal", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-modern" },
      { name: "Armaan Malik", seedLanguage: ["Hindi"], seedGenre: "playback", bucket: "bollywood-modern" },
    ],
  },
  {
    name: "Hindi Indie/Pop",
    language: "Hindi",
    artists: [
      { name: "Anuv Jain", seedLanguage: ["Hindi"], seedGenre: "indie", bucket: "hindi-indie" },
      { name: "Prateek Kuhad", seedLanguage: ["Hindi"], seedGenre: "indie", bucket: "hindi-indie" },
      { name: "Ritviz", seedLanguage: ["Hindi"], seedGenre: "indie", bucket: "hindi-indie" },
      { name: "When Chai Met Toast", seedLanguage: ["Hindi"], seedGenre: "indie", bucket: "hindi-indie" },
      { name: "The Local Train", seedLanguage: ["Hindi"], seedGenre: "rock", bucket: "hindi-indie" },
      { name: "Lucky Ali", seedLanguage: ["Hindi"], seedGenre: "pop", bucket: "hindi-indie" },
      { name: "Strings", seedLanguage: ["Hindi", "Urdu"], seedGenre: "rock", bucket: "hindi-indie" },
    ],
  },
  {
    name: "Hindi Rap/Hip-Hop",
    language: "Hindi",
    artists: [
      { name: "DIVINE", seedLanguage: ["Hindi", "English"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "Seedhe Maut", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "KR$NA", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "Raftaar", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "Emiway Bantai", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "MC Stan", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
      { name: "Karma", seedLanguage: ["Hindi"], seedGenre: "hip-hop", bucket: "hindi-rap" },
    ],
  },
  {
    name: "South Indian — Tamil",
    language: "Tamil",
    artists: [
      { name: "Ilaiyaraaja", seedLanguage: ["Tamil"], seedGenre: "composer", bucket: "south-tamil" },
      { name: "S. P. Balasubrahmanyam", seedLanguage: ["Tamil", "Telugu"], seedGenre: "playback", bucket: "south-tamil" },
      { name: "Anirudh Ravichander", seedLanguage: ["Tamil"], seedGenre: "composer", bucket: "south-tamil" },
      { name: "Harris Jayaraj", seedLanguage: ["Tamil"], seedGenre: "composer", bucket: "south-tamil" },
      { name: "Yuvan Shankar Raja", seedLanguage: ["Tamil"], seedGenre: "composer", bucket: "south-tamil" },
      { name: "Sid Sriram", seedLanguage: ["Tamil", "Telugu"], seedGenre: "playback", bucket: "south-tamil" },
    ],
  },
  {
    name: "South Indian — Telugu",
    language: "Telugu",
    artists: [
      { name: "Devi Sri Prasad", seedLanguage: ["Telugu"], seedGenre: "composer", bucket: "south-telugu" },
      { name: "Thaman S", seedLanguage: ["Telugu"], seedGenre: "composer", bucket: "south-telugu" },
      { name: "M. M. Keeravani", seedLanguage: ["Telugu"], seedGenre: "composer", bucket: "south-telugu" },
    ],
  },
  {
    name: "South Indian — Malayalam",
    language: "Malayalam",
    artists: [
      { name: "K. J. Yesudas", seedLanguage: ["Malayalam", "Tamil", "Telugu"], seedGenre: "playback", bucket: "south-malayalam" },
      { name: "Vijay Yesudas", seedLanguage: ["Malayalam"], seedGenre: "playback", bucket: "south-malayalam" },
    ],
  },
  {
    name: "Punjabi Music",
    language: "Punjabi",
    artists: [
      { name: "Diljit Dosanjh", seedLanguage: ["Punjabi", "Hindi"], seedGenre: "pop", bucket: "punjabi" },
      { name: "AP Dhillon", seedLanguage: ["Punjabi"], seedGenre: "pop", bucket: "punjabi" },
      { name: "Karan Aujla", seedLanguage: ["Punjabi"], seedGenre: "pop", bucket: "punjabi" },
      { name: "Guru Randhawa", seedLanguage: ["Punjabi", "Hindi"], seedGenre: "pop", bucket: "punjabi" },
      { name: "Gurdas Maan", seedLanguage: ["Punjabi"], seedGenre: "folk", bucket: "punjabi" },
      { name: "Daler Mehndi", seedLanguage: ["Punjabi", "Hindi"], seedGenre: "pop", bucket: "punjabi" },
    ],
  },
  {
    name: "English Pop",
    language: "English",
    artists: [
      { name: "Taylor Swift", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Ed Sheeran", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Billie Eilish", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Olivia Rodrigo", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "The Weeknd", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Dua Lipa", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Harry Styles", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Bruno Mars", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Adele", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
      { name: "Post Malone", seedLanguage: ["English"], seedGenre: "pop", bucket: "english-pop" },
    ],
  },
  {
    name: "English Hip-Hop/Rap",
    language: "English",
    artists: [
      { name: "Drake", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Kendrick Lamar", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Travis Scott", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "J. Cole", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Eminem", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Nicki Minaj", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Cardi B", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Tyler, the Creator", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "21 Savage", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
      { name: "Kanye West", seedLanguage: ["English"], seedGenre: "hip-hop", bucket: "english-rap" },
    ],
  },
];
