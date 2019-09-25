# Slippi Set Stats
This is a tool used to compute post-set stats from slp files for Melee tournaments. It is intended to be used as part of a production workflow to display post-set stats such as what was done at Mainstage 2019.

![image](https://user-images.githubusercontent.com/1534726/65564174-e8c92080-df00-11e9-9805-bfc83638f19d.png)
## Usage
1. Download executable for your operating system from the [Releases](https://github.com/JLaferri/slippi-set-stats/releases) tab
2. Move slp files from the same set to the folder containing the executable
3. Run the executable, will generate an output.json file with the stats
## Limitations
1. Cannot know who the players were, the best that can be known is the nametag used
2. If the players change ports during the set, the stats cannot be computed
## Output
The output json file contains three fields: `games`, `summary`, and `btsSummary`
### games
This field includes information about each individual game in the set. Example:
```
{ 
   "games":[ 
      { 
         "stage":{ 
            "id":2,
            "name":"Fountain of Dreams"
         },
         "players":[ 
            { 
               "port":1,
               "characterId":0,
               "characterColor":"Default",
               "nametag":"WIZY",
               "characterName":"Captain Falcon",
               "gameResult":"winner"
            },
            { 
               "port":4,
               "characterId":2,
               "characterColor":"Default",
               "nametag":"",
               "characterName":"Fox",
               "gameResult":"loser"
            }
         ],
         "startTime":"2019-06-16T19:02:32",
         "duration":"2:55"
      },
      { 
         "stage":{ 
            "id":32,
            "name":"Final Destination"
         },
         "players":[ 
            { 
               "port":1,
               "characterId":0,
               "characterColor":"Default",
               "nametag":"WIZY",
               "characterName":"Captain Falcon",
               "gameResult":"winner"
            },
            { 
               "port":4,
               "characterId":2,
               "characterColor":"Default",
               "nametag":"",
               "characterName":"Fox",
               "gameResult":"loser"
            }
         ],
         "startTime":"2019-06-16T19:05:41",
         "duration":"1:48"
      },
      { 
         "stage":{ 
            "id":8,
            "name":"Yoshi's Story"
         },
         "players":[ 
            { 
               "port":1,
               "characterId":0,
               "characterColor":"Default",
               "nametag":"WIZY",
               "characterName":"Captain Falcon",
               "gameResult":"winner"
            },
            { 
               "port":4,
               "characterId":2,
               "characterColor":"Default",
               "nametag":"",
               "characterName":"Fox",
               "gameResult":"loser"
            }
         ],
         "startTime":"2019-06-16T19:07:55",
         "duration":"2:06"
      }
   ]
}
```
### summary
This field contains detailed post-set stat results. The output is too long to put here but feel free to browse the contents yourself.
### btsSummary
This is a field added to help BTS by simplifying the data in the provided in the full summary. This summary includes:
1. The two move related non-numeric stats at the start
2. Openings per kill and total damage done
3. Two random stats from the remaining available stats

Randomizing the bottom two stats was used to keep the post-game set stats a bit more fresh with each showing. Eventually the structure of this output might be configurable.

Example:
```
{ 
   "btsSummary":[ 
      { 
         "id":"killMoves",
         "name":"Most Common Kill Move",
         "type":"text",
         "results":[ 
            "fair (10)",
            "bair (3)"
         ]
      },
      { 
         "id":"neutralOpenerMoves",
         "name":"Most Common Neutral Opener",
         "type":"text",
         "results":[ 
            "bair (7)",
            "nair (11)"
         ]
      },
      { 
         "id":"openingsPerKill",
         "name":"Openings / Kill",
         "type":"number",
         "betterDirection":"lower",
         "recommendedRounding":1,
         "results":[ 
            3.0833333333333335,
            5.142857142857143
         ]
      },
      { 
         "id":"damageDone",
         "name":"Total Damage Done",
         "type":"number",
         "betterDirection":"higher",
         "recommendedRounding":1,
         "results":[ 
            1096.5400123596191,
            968.7389011383057
         ]
      },
      { 
         "id":"damagePerOpening",
         "name":"Damage / Opening",
         "type":"number",
         "betterDirection":"higher",
         "recommendedRounding":1,
         "results":[ 
            29.636216550259977,
            26.90941392050849
         ]
      },
      { 
         "id":"inputsPerMinute",
         "name":"Inputs / Minute",
         "type":"number",
         "betterDirection":"higher",
         "recommendedRounding":1,
         "results":[ 
            537.9477642112073,
            449.1630953343576
         ]
      }
   ]
}
```
## Build Instructions
1. Install node 10.15.3
2. Install pkg using `npm i pkg -g`
3. Run `npm build` from the root of the repo
