const level50SkillExp = 55172425;
const level60SkillExp = 111672425;

// Skill Weight

const skillWeight = {
  // Maxes out mining at 1,750 points at 60.
  mining: {
    exponent: 1.18207448,
    divider: 259634,
    maxLevel: 60,
  },
  // Maxes out foraging at 850 points at level 50.
  foraging: {
    exponent: 1.232826,
    divider: 259634,
    maxLevel: 50,
  },
  // Maxes out enchanting at 450 points at level 60.
  enchanting: {
    exponent: 0.96976583,
    divider: 882758,
    maxLevel: 60,
  },
  // Maxes out farming at 2,200 points at level 60.
  farming: {
    exponent: 1.217848139,
    divider: 220689,
    maxLevel: 60,
  },
  // Maxes out combat at 1,500 points at level 60.
  combat: {
    exponent: 1.15797687265,
    divider: 275862,
    maxLevel: 60,
  },
  // Maxes out fishing at 2,500 points at level 50.
  fishing: {
    exponent: 1.406418,
    divider: 88274,
    maxLevel: 50,
  },
  // Maxes out alchemy at 200 points at level 50.
  alchemy: {
    exponent: 1.0,
    divider: 1103448,
    maxLevel: 50,
  },
  // Maxes out taming at 500 points at level 50.
  taming: {
    exponent: 1.14744,
    divider: 441379,
    maxLevel: 50,
  },
  // Sets up carpentry and runecrafting without any weight components.
  carpentry: {
    maxLevel: 50,
  },
  runecrafting: {
    maxLevel: 25,
  },
  social: {
    maxLevel: 25,
  },
};

function calcSkillWeight(skillGroup, level, experience) {
  if (skillGroup.exponent == undefined || skillGroup.divider == undefined) {
    return {
      weight: 0,
      weight_overflow: 0,
    };
  }

  const maxSkillLevelXP = skillGroup.maxLevel == 60 ? level60SkillExp : level50SkillExp;

  let base = Math.pow(level * 10, 0.5 + skillGroup.exponent + level / 100) / 1250;
  if (experience > maxSkillLevelXP) {
    base = Math.round(base);
  }

  if (experience <= maxSkillLevelXP) {
    return {
      weight: base,
      weight_overflow: 0,
    };
  }

  return {
    weight: base,
    weight_overflow: Math.pow((experience - maxSkillLevelXP) / skillGroup.divider, 0.968),
  };
}

// Dungeons Weight

const dungeonsWeight = {
  catacombs: 0.0002149604615,
  healer: 0.0000045254834,
  mage: 0.0000045254834,
  berserk: 0.0000045254834,
  archer: 0.0000045254834,
  tank: 0.0000045254834,
};

function calcDungeonsWeight(type, level, experience) {
  if (type.startsWith("master_")) {
    return {
      weight: 0,
      weight_overflow: 0,
    };
  }

  const percentageModifier = dungeonsWeight[type];
  const level50Experience = 569809640;

  const base = Math.pow(level, 4.5) * percentageModifier;

  if (experience <= level50Experience) {
    return {
      weight: base,
      weight_overflow: 0,
    };
  }

  const remaining = experience - level50Experience;
  const splitter = (4 * level50Experience) / base;

  return {
    weight: Math.floor(base),
    weight_overflow: Math.pow(remaining / splitter, 0.968),
  };
}

// Slayer Weight

const slayerWeight = {
  zombie: {
    divider: 2208,
    modifier: 0.15,
  },
  spider: {
    divider: 2118,
    modifier: 0.08,
  },
  wolf: {
    divider: 1962,
    modifier: 0.015,
  },
  enderman: {
    divider: 1430,
    modifier: 0.017,
  },
};

function calcSlayerWeight(type, experience) {
  const sw = slayerWeight[type];

  if (!sw) {
    return {
      weight: 0,
      weight_overflow: 0,
    };
  }

  if (!experience || experience <= 1000000) {
    return {
      weight: !experience ? 0 : experience / sw.divider, // for some reason experience can be undefined
      weight_overflow: 0,
    };
  }

  const base = 1000000 / sw.divider;
  let remaining = experience - 1000000;

  let modifier = sw.modifier;
  let overflow = 0;

  while (remaining > 0) {
    const left = Math.min(remaining, 1000000);

    overflow += Math.pow(left / (sw.divider * (1.5 + modifier)), 0.942);
    modifier += sw.modifier;
    remaining -= left;
  }

  return {
    weight: base,
    weight_overflow: overflow,
  };
}
/*
    All weight calculations are provided by Senither (https://github.com/Senither/)
  */

export function calculateSenitherWeight(profile) {
  const output = {
    overall: 0,
    dungeon: {
      total: 0,
      dungeons: {},
      classes: {},
    },
    skill: {
      total: 0,
      skills: {},
    },
    slayer: {
      total: 0,
      slayers: {},
    },
  };

  // skill
  for (const skillName in profile.levels) {
    const data = profile.levels[skillName];

    const sw = calcSkillWeight(skillWeight[skillName], data.unlockableLevelWithProgress, data.xp);

    output.skill.skills[skillName] = sw.weight + sw.weight_overflow;
    output.skill.total += output.skill.skills[skillName];
  }

  // dungeon weight
  const dungeons = profile.dungeons;

  if (dungeons?.catacombs?.visited) {
    const xp = dungeons.catacombs.level;
    const dungeonLevelWithProgress = Math.min(xp.levelWithProgress, 50);

    const dungeonsWeight = calcDungeonsWeight("catacombs", dungeonLevelWithProgress, xp.xp);
    output.dungeon.total += dungeonsWeight.weight + dungeonsWeight.weight_overflow ?? 0;
    output.dungeon.dungeons.catacombs = dungeonsWeight;
  }

  // dungeon classes
  if (dungeons.classes) {
    for (const className of Object.keys(dungeons.classes)) {
      const dungeonClass = dungeons.classes[className];
      const xp = dungeonClass.experience;

      const levelWithProgress = xp.levelWithProgress;

      const classWeight = calcDungeonsWeight(className, levelWithProgress, xp.xp);
      output.dungeon.total += classWeight.weight + classWeight.weight_overflow ?? 0;

      output.dungeon.classes[className] = classWeight;
    }
  }

  // slayer
  for (const slayerName in profile.slayers) {
    const data = profile.slayers[slayerName];
    const sw = calcSlayerWeight(slayerName, data.level.xp);

    output.slayer.slayers[slayerName] = sw.weight + sw.weight_overflow;
    output.slayer.total += output.slayer.slayers[slayerName];
  }

  output.overall = [output.dungeon.total, output.skill.total, output.slayer.total]
    .filter((x) => x >= 0)
    .reduce((total, value) => total + value);

  return output;
}
