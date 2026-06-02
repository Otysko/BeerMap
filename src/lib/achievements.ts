import { BeerVisit, Achievement } from "../types";

export function getAchievements(visits: BeerVisit[], visitedPubIds: string[]): Achievement[] {
  const uniquePubsCount = visitedPubIds.length;
  // Sort visits chronologically (ascending) for accurate timeline unlock dates
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group visits per pub by unique calendar days (local date string) to avoid multi-visit under 1 day
  const pubDailyVisitSets: Record<string, Set<string>> = {};
  sortedVisits.forEach((v) => {
    if (!pubDailyVisitSets[v.pubId]) {
      pubDailyVisitSets[v.pubId] = new Set<string>();
    }
    const localDate = v.timestamp ? new Date(v.timestamp).toLocaleDateString("cs-CZ") : new Date().toLocaleDateString("cs-CZ");
    pubDailyVisitSets[v.pubId].add(localDate);
  });

  const pubVisitCounts: Record<string, number> = {};
  Object.keys(pubDailyVisitSets).forEach((pubId) => {
    pubVisitCounts[pubId] = pubDailyVisitSets[pubId].size;
  });

  const maxVisitsToOnePub = Object.values(pubVisitCounts).length > 0 
    ? Math.max(...Object.values(pubVisitCounts)) 
    : 0;

  // Track beer attributes for those visits where a beer was actually consumed
  const consumedBeers = sortedVisits.filter((v) => v.beerName !== null);

  const uniqueStyles = new Set<string>();
  const uniqueBreweries = new Set<string>();
  const uniqueDegrees = new Set<string>();

  let hadTen = false;
  let hadEleven = false;
  let hadTwelve = false;
  let hadStrong = false; // >= 13
  let hadNordic = false; // >= 15
  let hadPlzen = false;
  let hadIpaApa = false;
  let hadDark = false;

  consumedBeers.forEach((v) => {
    if (v.style) uniqueStyles.add(v.style.trim().toLowerCase());
    if (v.brewery) uniqueBreweries.add(v.brewery.trim().toLowerCase());
    
    if (v.degrees) {
      const degStr = v.degrees.trim();
      uniqueDegrees.add(degStr);
      const num = parseFloat(degStr.replace("°", ""));
      if (!isNaN(num)) {
        if (num === 10) hadTen = true;
        if (num === 11) hadEleven = true;
        if (num === 12) hadTwelve = true;
        if (num >= 13) hadStrong = true;
        if (num >= 15) hadNordic = true;
      }
    }

    if (v.brewery && (
      v.brewery.toLowerCase().includes("plzeň") || 
      v.brewery.toLowerCase().includes("prazdroj") ||
      v.brewery.toLowerCase().includes("břevnov")
    )) {
      hadPlzen = true;
    }
    if (v.beerName && (
      v.beerName.toLowerCase().includes("pilsner") ||
      v.beerName.toLowerCase().includes("plzeň")
    )) {
      hadPlzen = true;
    }

    if (v.style) {
      const sLower = v.style.toLowerCase();
      if (sLower.includes("ipa") || sLower.includes("apa") || sLower.includes("pale ale") || sLower.includes("ejl")) {
        hadIpaApa = true;
      }
      if (sLower.includes("tmav") || sLower.includes("stout") || sLower.includes("čern") || sLower.includes("porter")) {
        hadDark = true;
      }
    }
  });

  // Time based features
  let hadNightBeer = false;
  let hadMorningBeer = false;

  sortedVisits.forEach((v) => {
    if (v.timestamp) {
      const date = new Date(v.timestamp);
      const hour = date.getHours();
      if (hour >= 22 || hour < 4) {
        hadNightBeer = true;
      }
      if (hour >= 8 && hour < 12) {
        hadMorningBeer = true;
      }
    }
  });

  // Unique counts
  const stylesCount = uniqueStyles.size;
  const breweriesCount = uniqueBreweries.size;

  // Find exact trigger timestamps for timeline unlocking
  let ach1Time = sortedVisits[0]?.timestamp;

  let ach2Time: string | undefined;
  const c2: Record<string, number> = {};
  for (const v of sortedVisits) {
    c2[v.pubId] = (c2[v.pubId] || 0) + 1; // wait, for ach2, count daily visits too for alignment or standard visits? Let's use daily visits to match!
  }
  const dailyCounters: Record<string, Set<string>> = {};
  for (const v of sortedVisits) {
    if (!dailyCounters[v.pubId]) dailyCounters[v.pubId] = new Set();
    const day = v.timestamp ? new Date(v.timestamp).toLocaleDateString("cs-CZ") : "";
    dailyCounters[v.pubId].add(day);
    if (dailyCounters[v.pubId].size === 3 && !ach2Time) {
      ach2Time = v.timestamp;
    }
  }

  // unique pubs milestones trigger dates
  let ach3Time: string | undefined;
  let ach4Time: string | undefined;
  let ach5Time: string | undefined;
  let ach6Time: string | undefined;
  const uniquePubsSet = new Set<string>();
  for (const v of sortedVisits) {
    uniquePubsSet.add(v.pubId);
    if (uniquePubsSet.size === 3 && !ach3Time) ach3Time = v.timestamp;
    if (uniquePubsSet.size === 5 && !ach4Time) ach4Time = v.timestamp;
    if (uniquePubsSet.size === 10 && !ach5Time) ach5Time = v.timestamp;
    if (uniquePubsSet.size === 15 && !ach6Time) ach6Time = v.timestamp;
  }

  // Beers degrees trigger dates
  const ach7Time = sortedVisits.find((v) => {
    if (!v.degrees) return false;
    const num = parseFloat(v.degrees.replace("°", ""));
    return num === 10;
  })?.timestamp;

  const ach8Time = sortedVisits.find((v) => {
    if (!v.degrees) return false;
    const num = parseFloat(v.degrees.replace("°", ""));
    return num === 11;
  })?.timestamp;

  const ach9Time = sortedVisits.find((v) => {
    if (!v.degrees) return false;
    const num = parseFloat(v.degrees.replace("°", ""));
    return num === 12;
  })?.timestamp;

  const ach10Time = sortedVisits.find((v) => {
    if (!v.degrees) return false;
    const num = parseFloat(v.degrees.replace("°", ""));
    return num >= 13;
  })?.timestamp;

  // ach-11: 10, 11, 12 combo completion date
  let t10: number | null = null, t11: number | null = null, t12: number | null = null;
  for (const v of sortedVisits) {
    if (v.degrees) {
      const num = parseFloat(v.degrees.replace("°", ""));
      if (num === 10 && !t10) t10 = new Date(v.timestamp).getTime();
      if (num === 11 && !t11) t11 = new Date(v.timestamp).getTime();
      if (num === 12 && !t12) t12 = new Date(v.timestamp).getTime();
    }
  }
  const ach11Time = (t10 && t11 && t12) ? new Date(Math.max(t10, t11, t12)).toISOString() : undefined;

  // ach-12: 3 styles
  let ach12Time: string | undefined;
  const stylesSet12 = new Set<string>();
  for (const v of sortedVisits) {
    if (v.style) {
      stylesSet12.add(v.style.trim().toLowerCase());
      if (stylesSet12.size === 3 && !ach12Time) ach12Time = v.timestamp;
    }
  }

  // ach-13: IPA/APA
  const ach13Time = sortedVisits.find((v) => {
    if (!v.style) return false;
    const sLower = v.style.toLowerCase();
    return sLower.includes("ipa") || sLower.includes("apa") || sLower.includes("pale ale") || sLower.includes("ejl");
  })?.timestamp;

  // ach-14: dark/black
  const ach14Time = sortedVisits.find((v) => {
    if (!v.style) return false;
    const sLower = v.style.toLowerCase();
    return sLower.includes("tmav") || sLower.includes("stout") || sLower.includes("čern") || sLower.includes("porter");
  })?.timestamp;

  // ach-15: 5 styles
  let ach15Time: string | undefined;
  const stylesSet15 = new Set<string>();
  for (const v of sortedVisits) {
    if (v.style) {
      stylesSet15.add(v.style.trim().toLowerCase());
      if (stylesSet15.size === 5 && !ach15Time) ach15Time = v.timestamp;
    }
  }

  // ach-16: 3 breweries
  let ach16Time: string | undefined;
  const breweriesSet16 = new Set<string>();
  for (const v of sortedVisits) {
    if (v.brewery) {
      breweriesSet16.add(v.brewery.trim().toLowerCase());
      if (breweriesSet16.size === 3 && !ach16Time) ach16Time = v.timestamp;
    }
  }

  // ach-17: 5 breweries
  let ach17Time: string | undefined;
  const breweriesSet17 = new Set<string>();
  for (const v of sortedVisits) {
    if (v.brewery) {
      breweriesSet17.add(v.brewery.trim().toLowerCase());
      if (breweriesSet17.size === 5 && !ach17Time) ach17Time = v.timestamp;
    }
  }

  // ach-18: after 22:00
  const ach18Time = sortedVisits.find((v) => {
    if (!v.timestamp) return false;
    const hour = new Date(v.timestamp).getHours();
    return hour >= 22 || hour < 4;
  })?.timestamp;

  // ach-19: before 12:00
  const ach19Time = sortedVisits.find((v) => {
    if (!v.timestamp) return false;
    const hour = new Date(v.timestamp).getHours();
    return hour >= 8 && hour < 12;
  })?.timestamp;

  // ach-20: >= 15°
  const ach20Time = sortedVisits.find((v) => {
    if (!v.degrees) return false;
    const num = parseFloat(v.degrees.replace("°", ""));
    return num >= 15;
  })?.timestamp;

  // List of all 20 Achievements
  const achievementsList: Omit<Achievement, "unlocked" | "progress">[] = [
    {
      id: "ach-1",
      title: "První doušek",
      description: "Zapiš svou první návštěvu v libovolné hospodě.",
      requirement: "Navštiv aspoň 1 hospodu.",
      category: "visits",
      iconName: "GlassWater",
      target: 1,
    },
    {
      id: "ach-2",
      title: "Štamgast v tréninku",
      description: "Navštiv své oblíbené místo aspoň 3krát.",
      requirement: "Zapiš 3 návštěvy v jedné konkrétní hospodě.",
      category: "visits",
      iconName: "Home",
      target: 3,
    },
    {
      id: "ach-3",
      title: "Pivní poutník",
      description: "Prozkoumej aspoň 3 různé hospůdky na mapě.",
      requirement: "Navštiv 3 unikátní hospody.",
      category: "visits",
      iconName: "Map",
      target: 3,
    },
    {
      id: "ach-4",
      title: "Zkušený cestovatel",
      description: "Navštiv aspoň 5 různých hospod.",
      requirement: "Navštiv 5 unikátních hospod.",
      category: "visits",
      iconName: "Compass",
      target: 5,
    },
    {
      id: "ach-5",
      title: "Lovce píp",
      description: "Navštiv celkem 10 různých hospod na mapě.",
      requirement: "Navštiv 10 unikátních hospod.",
      category: "visits",
      iconName: "MapPin",
      target: 10,
    },
    {
      id: "ach-6",
      title: "Prezidentská delegace",
      description: "Dosáhni pivního nebe s 15 navštívenými hospodami (jako Václav Havel).",
      requirement: "Navštiv 15 unikátních hospod.",
      category: "visits",
      iconName: "Award",
      target: 15,
    },
    {
      id: "ach-7",
      title: "Desítkář",
      description: "Dej si lehčí výčepní 10° na žízeň.",
      requirement: "Ochutnej aspoň jedno pivo o stupňovitosti 10°.",
      category: "beers",
      iconName: "Beer",
      target: 1,
    },
    {
      id: "ach-8",
      title: "Jedenáctka je základ",
      description: "Vychutnej si poctivou hořkou 11°.",
      requirement: "Ochutnej aspoň jedno pivo o stupňovitosti 11°.",
      category: "beers",
      iconName: "Beer",
      target: 1,
    },
    {
      id: "ach-9",
      title: "Plzeňský patriot",
      description: "Vypij klasický ležák 12°.",
      requirement: "Ochutnej aspoň jedno pivo o stupňovitosti 12°.",
      category: "beers",
      iconName: "Beer",
      target: 1,
    },
    {
      id: "ach-10",
      title: "Silný kalibr",
      description: "Ochutnej silný speciál o stupňovitosti 13° nebo více.",
      requirement: "Dej si pivo o síle 13° a vyšší.",
      category: "beers",
      iconName: "Flame",
      target: 1,
    },
    {
      id: "ach-11",
      title: "Znalec stupňů",
      description: "Ochutnej kompletní trojici české klasiky: 10°, 11° i 12° pivo.",
      requirement: "Zapiš si vypití 10°, 11° i 12°.",
      category: "special",
      iconName: "Sparkles",
      target: 3,
    },
    {
      id: "ach-12",
      title: "Pivní chameleon",
      description: "Ochutnej aspoň 3 různé pivní styly (např. Ležák, IPA, Stout).",
      requirement: "Vypij piva 3 různých stylů.",
      category: "styles",
      iconName: "Shuffle",
      target: 3,
    },
    {
      id: "ach-13",
      title: "Svrchně kvašený fajnšmekr",
      description: "Dej si pořádně chmelenou svrchně kvašenou IPU nebo APU.",
      requirement: "Zapiš si pivo stylu IPA nebo APA.",
      category: "styles",
      iconName: "Trees",
      target: 1,
    },
    {
      id: "ach-14",
      title: "Tma jako v sudu",
      description: "Ochutnej jedno tmavé pivo nebo stout plný kávových tónů.",
      requirement: "Zapiš si jedno tmavé/černé pivo.",
      category: "styles",
      iconName: "Moon",
      target: 1,
    },
    {
      id: "ach-15",
      title: "Cestovatel stylů",
      description: "Objev rozmanitost a vyzkoušej aspoň 5 různých pivních stylů.",
      requirement: "Vypij piva 5 různých stylů.",
      category: "styles",
      iconName: "Globe",
      target: 5,
    },
    {
      id: "ach-16",
      title: "Sládkův učeň",
      description: "Víš, odkud pivo teče. Zapiš piva ze 3 různých pivovarů.",
      requirement: "Ochutnej piva ze 3 různých pivovarů.",
      category: "breweries",
      iconName: "Award",
      target: 3,
    },
    {
      id: "ach-17",
      title: "Pivní baron",
      description: "Ochutnej poctivé kousky od aspoň 5 různých pivovarů.",
      requirement: "Ochutnej piva z 5 různých pivovarů.",
      category: "breweries",
      iconName: "Crown",
      target: 5,
    },
    {
      id: "ach-18",
      title: "Noční pták",
      description: "Dokonalé pivečko na dobrou noc těsně před zavíračkou.",
      requirement: "Zapiš si pivo po 22:00 hodině večer.",
      category: "special",
      iconName: "MoonStar",
      target: 1,
    },
    {
      id: "ach-19",
      title: "Ranní ptáče",
      description: "Vyprošťovák nebo dopolední osvěžení k obědu.",
      requirement: "Zapiš si pivo před 12:00 hodinou polední.",
      category: "special",
      iconName: "Sun",
      target: 1,
    },
    {
      id: "ach-20",
      title: "Vikingský roh",
      description: "Ochutnej extrémně silný speciál se stupňovitostí 15° nebo více.",
      requirement: "Vypij pivo o síle 15° a více.",
      category: "special",
      iconName: "Sword",
      target: 1,
    }
  ];

  // Map progress & unlocked states dynamically
  return achievementsList.map((ach) => {
    let progress = 0;
    let unlocked = false;
    let unlockedAt: string | undefined = undefined;

    switch (ach.id) {
      case "ach-1":
        // At least 1 pub visited overall
        progress = uniquePubsCount; // using uniquePubsCount ensures we count unique pubs
        unlocked = uniquePubsCount >= 1;
        if (unlocked) unlockedAt = ach1Time;
        break;
      case "ach-2":
        progress = maxVisitsToOnePub;
        unlocked = maxVisitsToOnePub >= 3;
        if (unlocked) unlockedAt = ach2Time;
        break;
      case "ach-3":
        progress = uniquePubsCount;
        unlocked = uniquePubsCount >= 3;
        if (unlocked) unlockedAt = ach3Time;
        break;
      case "ach-4":
        progress = uniquePubsCount;
        unlocked = uniquePubsCount >= 5;
        if (unlocked) unlockedAt = ach4Time;
        break;
      case "ach-5":
        progress = uniquePubsCount;
        unlocked = uniquePubsCount >= 10;
        if (unlocked) unlockedAt = ach5Time;
        break;
      case "ach-6":
        progress = uniquePubsCount;
        unlocked = uniquePubsCount >= 15;
        if (unlocked) unlockedAt = ach6Time;
        break;
      case "ach-7":
        progress = hadTen ? 1 : 0;
        unlocked = hadTen;
        if (unlocked) unlockedAt = ach7Time;
        break;
      case "ach-8":
        progress = hadEleven ? 1 : 0;
        unlocked = hadEleven;
        if (unlocked) unlockedAt = ach8Time;
        break;
      case "ach-9":
        progress = hadTwelve ? 1 : 0;
        unlocked = hadTwelve;
        if (unlocked) unlockedAt = ach9Time;
        break;
      case "ach-10":
        progress = hadStrong ? 1 : 0;
        unlocked = hadStrong;
        if (unlocked) unlockedAt = ach10Time;
        break;
      case "ach-11":
        const countClas = (hadTen ? 1 : 0) + (hadEleven ? 1 : 0) + (hadTwelve ? 1 : 0);
        progress = countClas;
        unlocked = countClas >= 3;
        if (unlocked) unlockedAt = ach11Time;
        break;
      case "ach-12":
        progress = stylesCount;
        unlocked = stylesCount >= 3;
        if (unlocked) unlockedAt = ach12Time;
        break;
      case "ach-13":
        progress = hadIpaApa ? 1 : 0;
        unlocked = hadIpaApa;
        if (unlocked) unlockedAt = ach13Time;
        break;
      case "ach-14":
        progress = hadDark ? 1 : 0;
        unlocked = hadDark;
        if (unlocked) unlockedAt = ach14Time;
        break;
      case "ach-15":
        progress = stylesCount;
        unlocked = stylesCount >= 5;
        if (unlocked) unlockedAt = ach15Time;
        break;
      case "ach-16":
        progress = breweriesCount;
        unlocked = breweriesCount >= 3;
        if (unlocked) unlockedAt = ach16Time;
        break;
      case "ach-17":
        progress = breweriesCount;
        unlocked = breweriesCount >= 5;
        if (unlocked) unlockedAt = ach17Time;
        break;
      case "ach-18":
        progress = hadNightBeer ? 1 : 0;
        unlocked = hadNightBeer;
        if (unlocked) unlockedAt = ach18Time;
        break;
      case "ach-19":
        progress = hadMorningBeer ? 1 : 0;
        unlocked = hadMorningBeer;
        if (unlocked) unlockedAt = ach19Time;
        break;
      case "ach-20":
        progress = hadNordic ? 1 : 0;
        unlocked = hadNordic;
        if (unlocked) unlockedAt = ach20Time;
        break;
    }

    return {
      ...ach,
      progress: Math.min(progress, ach.target),
      unlocked,
      unlockedAt,
    };
  });
}
