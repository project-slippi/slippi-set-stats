const { 
  default: SlippiGame, stages: stageUtil, moves: moveUtil, characters: characterUtil
} = require('slp-parser-js');
const util = require('util')
const moment = require('moment');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

const stats = {
  OPENINGS_PER_KILL: "openingsPerKill",
  DAMAGE_PER_OPENING: "damagePerOpening",
  NEUTRAL_WINS: "neutralWins",
  KILL_MOVES: "killMoves",
  NEUTRAL_OPENER_MOVES: "neutralOpenerMoves",
  EARLY_KILLS: "earlyKills",
  LATE_DEATHS: "lateDeaths",
  SELF_DESTRUCTS: "selfDestructs",
  INPUTS_PER_MINUTE: "inputsPerMinute",
  AVG_KILL_PERCENT: "avgKillPercent",
  HIGH_DAMAGE_PUNISHES: "highDamagePunishes",
  DAMAGE_DONE: "damageDone",
};

const statDefininitions = {
  [stats.OPENINGS_PER_KILL]: {
    id: stats.OPENINGS_PER_KILL,
    name: "Openings / Kill",
    type: "number",
    betterDirection: "lower",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      return genOverallRatioStat(games, playerIndex, 'openingsPerKill', 1);
    },
  }, 
  [stats.DAMAGE_PER_OPENING]: {
    id: stats.DAMAGE_PER_OPENING,
    name: "Damage / Opening",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      return genOverallRatioStat(games, playerIndex, 'damagePerOpening', 1);
    },
  },
  [stats.NEUTRAL_WINS]: {
    id: stats.NEUTRAL_WINS,
    name: "Neutral Wins",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 0,
    calculate: (games, playerIndex) => {
      return genOverallRatioStat(games, playerIndex, 'neutralWinRatio', 0, 'count');
    },
  },
  [stats.KILL_MOVES]: {
    id: stats.KILL_MOVES,
    name: "Most Common Kill Move",
    type: "text",
    calculate: (games, playerIndex) => {
      const killMoves = _.flatMap(games, game => {
        const conversions = _.get(game, ['stats', 'conversions']) || [];
        const conversionsForPlayer = _.filter(conversions, conversion => {
          const isForPlayer = conversion.playerIndex === playerIndex;
          const didKill = conversion.didKill;
          return isForPlayer && didKill;
        });

        return _.map(conversionsForPlayer, conversion => {
          return _.last(conversion.moves);
        });
      });

      const killMovesByMove = _.groupBy(killMoves, 'moveId');
      const killMoveCounts = _.map(killMovesByMove, moves => {
        const move = _.first(moves);
        return {
          count: moves.length,
          id: move.moveId,
          name: moveUtil.getMoveName(move.moveId),
          shortName: moveUtil.getMoveShortName(move.moveId),
        };
      });

      const orderedKillMoveCounts = _.orderBy(killMoveCounts, ['count'], ['desc']);
      const topKillMove = _.first(orderedKillMoveCounts);
      let simpleText = "N/A";
      if (topKillMove) {
        simpleText = `${topKillMove.shortName} (${topKillMove.count})`;
      }

      return {
        result: orderedKillMoveCounts,
        simple: {
          text: simpleText, 
        }
      }
    },
  },
  [stats.NEUTRAL_OPENER_MOVES]: {
    id: stats.NEUTRAL_OPENER_MOVES,
    name: "Most Common Neutral Opener",
    type: "text",
    calculate: (games, playerIndex) => {
      const neutralMoves = _.flatMap(games, game => {
        const conversions = _.get(game, ['stats', 'conversions']) || [];
        const conversionsForPlayer = _.filter(conversions, conversion => {
          const isForPlayer = conversion.playerIndex === playerIndex;
          const isNeutralWin = conversion.openingType === 'neutral-win';
          return isForPlayer && isNeutralWin;
        });

        return _.map(conversionsForPlayer, conversion => {
          return _.first(conversion.moves);
        });
      });

      // TODO: This following code is repeated from kill move code, put in function

      const neutralMovesByMove = _.groupBy(neutralMoves, 'moveId');
      const neutralMoveCounts = _.map(neutralMovesByMove, moves => {
        const move = _.first(moves);
        return {
          count: moves.length,
          id: move.moveId,
          name: moveUtil.getMoveName(move.moveId),
          shortName: moveUtil.getMoveShortName(move.moveId),
        };
      });

      const orderedNeutralMoveCounts = _.orderBy(neutralMoveCounts, ['count'], ['desc']);
      const topNeutralMove = _.first(orderedNeutralMoveCounts);
      let simpleText = "N/A";
      if (topNeutralMove) {
        simpleText = `${topNeutralMove.shortName} (${topNeutralMove.count})`;
      }

      return {
        result: orderedNeutralMoveCounts,
        simple: {
          text: simpleText, 
        }
      }
    },
  }, 
  [stats.EARLY_KILLS]: {
    id: stats.EARLY_KILLS,
    name: "Earliest Kill",
    type: "number",
    betterDirection: "lower",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      const oppStocks = _.flatMap(games, game => {
        const stocks = _.get(game, ['stats', 'stocks']) || [];
        return _.filter(stocks, stock => {
          const isOpp = stock.playerIndex !== playerIndex;
          const hasEndPercent = stock.endPercent !== null;
          return isOpp && hasEndPercent;
        });
      });

      const orderedOppStocks = _.orderBy(oppStocks, ['endPercent'], ['asc']);
      const earliestKillStock = _.first(orderedOppStocks);
      const simple = {
        text: "N/A",
        number: null,
      };

      if (earliestKillStock) {
        simple.number = earliestKillStock.endPercent;
        simple.text = simple.number.toFixed(1);
      }

      return {
        result: _.take(orderedOppStocks, 5),
        simple: simple,
      };
    },
  },
  [stats.LATE_DEATHS]: {
    id: stats.LATE_DEATHS,
    name: "Latest Death",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      const playerStocks = _.flatMap(games, game => {
        const stocks = _.get(game, ['stats', 'stocks']) || [];
        return _.filter(stocks, stock => {
          const isPlayer = stock.playerIndex === playerIndex;
          const hasEndPercent = stock.endPercent !== null;
          return isPlayer && hasEndPercent;
        });
      });

      const orderedPlayerStocks = _.orderBy(playerStocks, ['endPercent'], ['desc']);
      const latestDeathStock = _.first(orderedPlayerStocks);
      const simple = {
        text: "N/A",
        number: null,
      };

      if (latestDeathStock) {
        simple.number = latestDeathStock.endPercent;
        simple.text = simple.number.toFixed(1);
      }

      return {
        result: _.take(orderedPlayerStocks, 5),
        simple: simple,
      };
    },
  },
  [stats.SELF_DESTRUCTS]: {
    id: stats.SELF_DESTRUCTS, // Only show this one if greater than 2 for one player
    name: "Total Self-Destructs",
    type: "number",
    betterDirection: "lower",
    recommendedRounding: 0,
    calculate: (games, playerIndex) => {
      const sdCounts = _.map(games, game => {
        const stocks = _.get(game, ['stats', 'stocks']) || [];
        const playerEndedStocks = _.filter(stocks, stock => {
          const isPlayer = stock.playerIndex === playerIndex;
          const hasEndPercent = stock.endPercent !== null;
          return isPlayer && hasEndPercent;
        });

        const conversions = _.get(game, ['stats', 'conversions']) || [];
        const oppKillConversions = _.filter(conversions, conversion => {
          const isOpp = conversion.playerIndex !== playerIndex;
          const didKill = conversion.didKill;
          return isOpp && didKill;
        });

        return playerEndedStocks.length - oppKillConversions.length;
      });

      const sdSum = _.sum(sdCounts);
      
      return {
        result: sdSum,
        simple: {
          number: sdSum,
          text: `${sdSum}`,
        },
      };
    },
  },
  [stats.INPUTS_PER_MINUTE]: {
    id: stats.INPUTS_PER_MINUTE,
    name: "Inputs / Minute",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      return genOverallRatioStat(games, playerIndex, 'inputsPerMinute', 1);
    },
  },
  [stats.AVG_KILL_PERCENT]: {
    id: stats.AVG_KILL_PERCENT,
    name: "Average Kill Percent",
    type: "number",
    betterDirection: "lower",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      const oppStocks = _.flatMap(games, game => {
        const stocks = _.get(game, ['stats', 'stocks']) || [];
        return _.filter(stocks, stock => {
          const isOpp = stock.playerIndex !== playerIndex;
          const hasEndPercent = stock.endPercent !== null;
          return isOpp && hasEndPercent;
        });
      });

      const result = {
        total: oppStocks.length,
        count: _.sumBy(oppStocks, 'endPercent') || 0,
      };

      result.ratio = result.total ? result.count / result.total : null;

      return {
        result: result,
        simple: genSimpleFromRatio(result, 1),
      };
    },
  },
  [stats.HIGH_DAMAGE_PUNISHES]: {
    id: stats.HIGH_DAMAGE_PUNISHES,
    name: "Highest Damage Punish",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      const punishes = _.flatMap(games, game => {
        const conversions = _.get(game, ['stats', 'conversions']) || [];
        return _.filter(conversions, conversion => {
          const isForPlayer = conversion.playerIndex === playerIndex;
          const hasEndPercent = conversion.endPercent !== null;
          return isForPlayer && hasEndPercent;
        });
      });

      const getDamageDone = punish => punish.endPercent - punish.startPercent;
      const orderedPunishes = _.orderBy(punishes, [getDamageDone], 'desc');
      const topPunish = _.first(orderedPunishes);
      const simple = {
        text: "N/A",
        number: null,
      };

      if (topPunish) {
        simple.number = getDamageDone(topPunish);
        simple.text = simple.number.toFixed(1);
      }

      return {
        result: _.take(orderedPunishes, 5),
        simple: simple,
      };
    },
  },
  [stats.DAMAGE_DONE]: {
    id: stats.DAMAGE_DONE,
    name: "Total Damage Done",
    type: "number",
    betterDirection: "higher",
    recommendedRounding: 1,
    calculate: (games, playerIndex) => {
      return genOverallRatioStat(games, playerIndex, 'damagePerOpening', 1, 'count');
    },
  },
}

function genOverallRatioStat(games, playerIndex, field, fixedNum, type = "ratio") {
  const statRatios = _.map(games, (game) => {
    const overallStats = _.get(game, ['stats', 'overall']);
    const overallStatsByPlayer = _.keyBy(overallStats, 'playerIndex');
    const overallStatsForPlayer = overallStatsByPlayer[playerIndex];
    return overallStatsForPlayer[field];
  });

  const avg = averageRatios(statRatios);
  const simple = genSimpleFromRatio(avg, fixedNum, type);

  return {
    result: avg,
    simple: simple,
  };
}

function averageRatios(ratios) {
  const result = {};

  result.count = _.sumBy(ratios, 'count') || 0;
  result.total = _.sumBy(ratios, 'total') || 0;
  result.ratio = result.total ? result.count / result.total : null;

  return result;
}

function genSimpleFromRatio(ratio, fixedNum, type = "ratio") {
  const result = {};

  switch (type) {
    case 'ratio':
      result.number = ratio.ratio;
      result.text = ratio.ratio !== null ? ratio.ratio.toFixed(fixedNum) : "N/A";
      break;
    case 'count':
      result.number = ratio.count;
      result.text = ratio.count.toFixed(fixedNum);
      break;
  }
  
  return result;
}

function parseFilesInFolder() {
  const dirPath = process.cwd();
  const dirContents = fs.readdirSync(dirPath, { withFileTypes: true });

  console.log("Reading files in directory...\n");
  const gameDetails = _.chain(dirContents).filter((item) => {
    return item.isFile() && path.extname(item.name) === ".slp";
  }).map((slpItem) => {
    const slpFilePath = path.join(dirPath, slpItem.name);
    const game = new SlippiGame(slpFilePath);
    return {
      filePath: slpFilePath,
      settings: game.getSettings(),
      frames: game.getFrames(),
      stats: game.getStats(),
      metadata: game.getMetadata(),
      latestFrame: game.getLatestFrame(),
      gameEnd: game.getGameEnd(),
    };
  }).value();

  return gameDetails;
}

function filterGames(games) {
  // console.log(games);
  const gamesByIsSingles = _.groupBy(games, (game) => {
    const numberOfPlayers = game.settings.players.length;
    return numberOfPlayers === 2;
  });

  const nonSinglesGames = _.get(gamesByIsSingles, false) || [];
  if (_.some(nonSinglesGames)) {
    console.log("The following games have been excluded because they are not singles games:");
    _.forEach(nonSinglesGames, (game) => {
      console.log(game.filePath);
    });
    console.log();
  }

  const singlesGames = _.get(gamesByIsSingles, true) || [];
  const gamesByPorts = _.chain(singlesGames).groupBy((game) => {
    const ports = _.map(game.settings.players, 'port');
    return _.join(ports, '-');
  }).orderBy(['length'], ['desc']).value();

  const gamesWithSamePorts = gamesByPorts.shift();
  if (_.some(gamesByPorts)) {
    console.log("The following games have been excluded because the player ports differ:");
    const flatGames = _.flatten(gamesByPorts);
    _.forEach(flatGames, (game) => {
      console.log(game.filePath);
    });
    console.log();
  }

  if (_.isEmpty(gamesWithSamePorts)) {
    throw new Error("There were no valid games found to compute stats from.");
  }

  console.log(`Including ${gamesWithSamePorts.length} games for stat calculation...`);

  return gamesWithSamePorts;
}

function computeStats(games) {
  const firstGame = _.first(games);
  // console.log(firstGame);
  const orderIndices = _.map(firstGame.settings.players, 'playerIndex');
  const reversedIndices = _.chain(orderIndices).clone().reverse().value();
  const indices = [orderIndices, reversedIndices];

  const statResults = _.flatMap(stats, statKey => {
    const def = statDefininitions[statKey];
    if (!def.calculate) {
      return [];
    }

    const results = _.map(indices, (iIndices) => {
      const result = def.calculate(games, iIndices[0], iIndices[1]);
      result.port = iIndices[0] + 1;
      return result;
    });

    const output = { ...def };
    delete output.calculate;
    output.results = results;

    return [output];
  });

  return statResults;
}

function generateGameInfo(games) {
  const getStartAt = (game) => game.metadata.startAt;
  const orderedGames = _.orderBy(games, [getStartAt], ['asc']);

  const getResultForPlayer = (game, playerIndex) => {
    // console.log(game);
    // Calculate assumed game result
    const gameEnd = game.gameEnd;
    if (!gameEnd) {
      return "unknown";
    }

    const players = _.get(game.settings, ['players']);
    const opp = _.filter(players, player => player.playerIndex !== playerIndex);
    const oppIndex = _.get(opp, [0, 'playerIndex']);

    switch (gameEnd.gameEndMethod) {
      case 1:
        // This is a TIME! ending, not implemented yet
        return "unknown";
      case 2:
        // This is a GAME! ending
        const latestFrame = _.get(game.latestFrame, 'players') || [];
        const playerStocks = _.get(latestFrame, [playerIndex, 'post', 'stocksRemaining']);
        const oppStocks = _.get(latestFrame, [oppIndex, 'post', 'stocksRemaining']);
        if (playerStocks === 0 && oppStocks === 0) {
          return "unknown";
        }

        return playerStocks === 0 ? "loser" : "winner";
      case 7:
        return gameEnd.lrasInitiatorIndex === playerIndex ? "loser" : "winner";
    }

    return "unknown";
  };

  const generatePlayerInfo = game => player => {
    // console.log(player);
    return {
      port: player.port,
      characterId: player.characterId,
      characterColor: player.characterColor,
      nametag: player.nametag,
      characterName: characterUtil.getCharacterName(player.characterId),
      characterColor: characterUtil.getCharacterColorName(player.characterId, player.characterColor),
      gameResult: getResultForPlayer(game, player.playerIndex),
    };
  };

  return _.map(orderedGames, (game) => {
    const playerInfoGen = generatePlayerInfo(game);

    return {
      stage: {
        id: game.settings.stageId,
        name: stageUtil.getStageName(game.settings.stageId),
      },
      players: _.map(game.settings.players, playerInfoGen),
      startTime: game.metadata.startAt,
      duration: convertFrameCountToDurationString(game.stats.lastFrame),
    }
  });
}

function generateBtsSummary(summary) {
  const fixedStats = [
    stats.KILL_MOVES,
    stats.NEUTRAL_OPENER_MOVES,
    stats.OPENINGS_PER_KILL,
    stats.DAMAGE_DONE,
  ];

  const randomizeCount = 2;

  const generateSummaryItem = fullStatOutput => {
    const type = fullStatOutput.type;

    const output = { ...fullStatOutput };
    output.results = _.map(fullStatOutput.results, result => _.get(result, ['simple', type]));

    return output;
  };

  const result = [];

  const statsById = _.keyBy(summary, 'id');
  const statsToRandomizeById = statsById;
  
  // Add fixed stats
  _.forEach(fixedStats, statId => {
    const statOutput = statsById[statId];
    result.push(generateSummaryItem(statOutput));

    delete statsToRandomizeById[statId];
  });

  // Deal with SDs
  const sdStat = statsById[stats.SELF_DESTRUCTS];
  const sds1 = sdStat.results[0].simple.number;
  const sds2 = sdStat.results[0].simple.number;
  const shouldIncludeSds = sds1 > 1 || sds2 > 1;
  if (!shouldIncludeSds) {
    delete statsToRandomizeById[stats.SELF_DESTRUCTS];
  }

  const shuffled = _.shuffle(statsToRandomizeById);
  const shuffledToInclude = _.take(shuffled, randomizeCount);
  _.forEach(shuffledToInclude, statOutput => {
    result.push(generateSummaryItem(statOutput));
  });

  return result;
}

function convertFrameCountToDurationString(frameCount) {
  const duration = moment.duration(frameCount / 60, 'seconds');
  return moment.utc(duration.as('milliseconds')).format('m:ss');
}

function generateOutput(games) {
  const stats = computeStats(games);
  
  return {
    games: generateGameInfo(games),
    summary: stats,
    btsSummary: generateBtsSummary(stats),
  };
}

function writeToFile(output) {
  console.log(util.inspect(output, { depth: 6, colors: true }));
  fs.writeFileSync('output.json', JSON.stringify(output));
  console.log("Finished writting stats to output.json!");
}

module.exports = function () {
  const games = parseFilesInFolder();
  const filteredGames = filterGames(games);
  const output = generateOutput(filteredGames);
  writeToFile(output);
};
