// Vercel Serverless Function: Find scholarships matching Jasmine's profile
// POST /jasmine/api/find-scholarships { gpa, interests, background, state }

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Curated scholarships matching Jasmine's profile
  const SCHOLARSHIPS = [
    // Photography & Arts
    {
      name: "Scholastic Art & Writing Awards",
      amount: "Up to $10,000",
      deadline: "December 2026",
      category: "arts",
      match: ["photography", "arts", "national-awards"],
      url: "https://www.artandwriting.org/",
      note: "You already won Gold Medal! Apply again next year."
    },
    {
      name: "YoungArts National Arts Competition",
      amount: "$1,000 - $10,000",
      deadline: "October 2026",
      category: "arts",
      match: ["photography", "arts"],
      url: "https://www.youngarts.org/"
    },
    {
      name: "Aperture Portfolio Prize",
      amount: "$5,000",
      deadline: "January 2027",
      category: "arts",
      match: ["photography"],
      url: "https://aperture.org/"
    },

    // Military Family
    {
      name: "VFW Voice of Democracy",
      amount: "Up to $30,000",
      deadline: "October 31, 2026",
      category: "military",
      match: ["military-family"],
      url: "https://www.vfw.org/VOD"
    },
    {
      name: "Children of Warriors Scholarship",
      amount: "$5,000",
      deadline: "March 2027",
      category: "military",
      match: ["military-family"],
      url: "https://www.legion-aux.org/"
    },
    {
      name: "Military Child of the Year",
      amount: "$10,000",
      deadline: "February 2027",
      category: "military",
      match: ["military-family", "community-service"],
      url: "https://militarychild.org/"
    },
    {
      name: "Pat Tillman Foundation Scholarship",
      amount: "Varies",
      deadline: "February 2027",
      category: "military",
      match: ["military-family"],
      url: "https://pattillmanfoundation.org/"
    },

    // Community Service & Leadership
    {
      name: "Prudential Spirit of Community Awards",
      amount: "$1,000 - $5,000",
      deadline: "November 2026",
      category: "service",
      match: ["community-service"],
      url: "https://spirit.prudential.com/"
    },
    {
      name: "Horatio Alger National Scholarship",
      amount: "$25,000",
      deadline: "October 2026",
      category: "service",
      match: ["community-service"],
      url: "https://scholars.horatioalger.org/"
    },

    // Entrepreneurship & Business
    {
      name: "NFIB Young Entrepreneur Award",
      amount: "$1,000 - $15,000",
      deadline: "December 2026",
      category: "business",
      match: ["business", "entrepreneurship"],
      url: "https://www.nfib.com/",
      note: "Perfect for jazz.ysphotos!"
    },
    {
      name: "Network for Teaching Entrepreneurship",
      amount: "$1,000 - $10,000",
      deadline: "Varies",
      category: "business",
      match: ["business", "entrepreneurship"],
      url: "https://www.nfte.com/"
    },

    // Florida Specific
    {
      name: "Florida Bright Futures",
      amount: "75-100% Tuition",
      deadline: "Ongoing",
      category: "florida",
      match: ["florida"],
      url: "https://www.floridastudentfinancialaidsg.org/",
      note: "Priority! Check GPA & service hour requirements."
    },
    {
      name: "Florida Prepaid Scholarship",
      amount: "Varies",
      deadline: "April 2027",
      category: "florida",
      match: ["florida"],
      url: "https://www.myfloridaprepaid.com/"
    },

    // General Merit
    {
      name: "Coca-Cola Scholars Program",
      amount: "$20,000",
      deadline: "October 2026",
      category: "merit",
      match: ["national-awards", "community-service"],
      url: "https://www.coca-colascholarsfoundation.org/"
    },
    {
      name: "Elks Most Valuable Student",
      amount: "Up to $50,000",
      deadline: "November 2026",
      category: "merit",
      match: ["community-service"],
      url: "https://www.elks.org/scholars/"
    },
    {
      name: "Dell Scholars Program",
      amount: "$20,000",
      deadline: "December 2026",
      category: "merit",
      match: ["community-service"],
      url: "https://www.dellscholars.org/"
    },
    {
      name: "Jack Kent Cooke Young Scholars",
      amount: "Full Scholarship",
      deadline: "April 2027",
      category: "merit",
      match: ["national-awards"],
      url: "https://www.jkcf.org/"
    },

    // Women & Diversity
    {
      name: "Glamour Top 10 College Women",
      amount: "$20,000",
      deadline: "September 2027",
      category: "women",
      match: ["arts", "community-service"],
      url: "https://www.glamour.com/",
      note: "For college freshmen - apply next year!"
    }
  ];

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { interests = [], background = [], state = '' } = body;
    const searchTerms = [...interests, ...background, state.toLowerCase()];

    // Score and filter scholarships
    const scored = SCHOLARSHIPS.map(s => {
      let score = 0;
      s.match.forEach(m => {
        if (searchTerms.includes(m)) score += 2;
      });
      // Bonus for notes (means it's especially relevant)
      if (s.note) score += 1;
      return { ...s, score };
    });

    // Sort by score and return top matches
    const matches = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      scholarships: matches,
      totalFound: matches.length
    });

  } catch (error) {
    console.error('Scholarship search error:', error);
    return res.status(500).json({ error: 'Search failed', details: error.message });
  }
}
