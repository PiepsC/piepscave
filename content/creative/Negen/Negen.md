
# Negen - a mathematician's game

## Game details
**Players: 2 to 4**

**Duration: variable, but intended to be around 30-40 minutes**

**Difficulty: intermediate**

**Requires: a note to keep track of the score, a lot of preferably 12mm dice - up to around 50 for 4 players**

Designed by Lars Willemsen in 2024

## Rationale

Games that use few rules to induce a great deal of variation have always fascinated me. Chess and Go are straightforward examples, but Rummikub (originally a card game redesigned to instead uitilize smaller, more convenient rectangular tiles) too is a great example. The latter I found especially interesting considering it does not confine itself to being a head-to-head game. If you are into combinatorics all of these games can be analyzed quite neatly, making it comparatively straightforward to deliver a consistent, neat experience as a challenge. I did not do this write-up to convince you of the math, so continuing to read does not put you at risk of running into some particularly nasty equations!

My goal with Negen was to design a game using only dice, relying on a similar [exploding permutation based approach](https://en.wikipedia.org/wiki/Combinatorial_explosion#Latin_squares) we see in aforementioned games. These games tend to test the players' ability to process large state spaces, making them dull but arguably "intelligent" by design. Similar to Rummikub this is partially mitigated by being able to take control of the game's pace in especially daunting turns. The incorporation of dice can be leveraged to give the impression of chance playing a big role, even if quite modest in reality.

The name "Negen" means "Nine" in dutch. It is a palindrome representing the smallest amount of steps you need to take to prove a "loop" in the game, starting and ending at the same die. The length of the word also constitutes a legal sequence defined by the game's rules.

| ![Negen](content/creative/Negen/Negen.jpg) |
| :--: |
| *Negen : a simple permutation based game played with only dice!* |

## Ground rules

In Negen players try to add sequences of die to pre-existing "spirals" currently present on the table. A spiral is considered "legal" if it either:
- it conists of a single die
- it consists of only legal **sequences**

A sequence is a straight (i.e. non-diagonal) line of exactly three connected die either in strictly ascended or descending order with a maximum of a single digit difference between each. A single sequence consists of two *nodes* and one *edge*. The image below illustrates the concept of sequences. The arrows point towards the nodes in the sequence. The bottom image displays a legal spiral consisting of two individual sequences: 5-4-3 and 3-4-5 (or vice versa, sequences are legal *bidirectionally*). The right image has no legal interpretation of sequences, and thus is not a legal spiral. In this image we need the die with 2, 4, 5 and the 3 on the bottom right to be considered nodes - but that leaves us with an illegal sequence of 3 connected nodes (5-4-3 in the bottom row are all nodes). Alternatively we could try the interpretation of 4 being an edge, but then 2-3-4 would consist of a single node and 2 edges. This spiral has earned itself a one way trip to math-jail!


| ![Negen](content/creative/Negen/Sequences.jpg) |
| :--: |
| *Sequences are considered legal if there exists a right interpretation of nodes and edges* |

## The goal

The goal in Negen is to obtain *complete* spirals. A spiral is considered complete when there exists a *path* where a node is reached more than once. A path is a set of directional sequences where each next sequence is the predecessor of the former, unless it is the first sequence. No single directional sequence in a path may have two directional interpretations. Oof! That sounds complicated. Fortunately it really is not. Below is an illustration of a spiral that has a path where nodes can be reached more than once, and a path that has no possible interpretation of a path with the same property:

| ![Negen](content/creative/Negen/Paths.jpg) |
| :--: |
| *Interpreting the direction of sequences may not be ambiguous when forming a path* |

Notice that for the first example, marked with the big red cross, we cannot find a path with unique directional interpretations to reach a single node twice. We would have to move from either 1 or 3 to the opposite end and then back! The second example does have a valid interpretation, simply by looping all the way back to the beginning.

When a spiral is completed by a player they may count all the dice it consists of (i.e. all dice to which there exists a path), count a single point for each regardless of their score and add this number to their current points. The spiral is then entirely removed from the table and the dice placed back in the pool of unused dice. If this leaves the table without any spiral then take a single die, randomize it and place it on the table as the new spiral. The player with most points at the end of the game wins!


## Playing Negen

Each player draws 4 dice and randomizes them. These dice are placed in front of each player, visible to everyone. They do not change value unless specified by the rules. The oldest player at the table begins the game.

At the start of the game two die are taken from the pool of unused die. They are randomized and placed on the table as individual spirals. During a turn the player may connect any legal sequence to either of the spirals. They may also *connect* the spirals, as long as the resulting spiral is also legal. They may not introduce *new* spirals. When connecting spiral either spiral may be *mirrored* vertically and horizontally and *rotated* (by 90 degrees per rotation, obviously), in any order as often as the player desires. If a player has added any of their four dice to the spiral(s) but not all of them and either can no longer add more, or does not want to, they draw new dice until they have four again. The new dice are randomized. The remaining die remain as they were. This forfeits the player's turn.

Alternatively, if the player can not or does not want to partake in a turn *at all* they may randomize any amount of their current die, but must also add a new randomized die to the table serving as a new spiral.

If a player manages to use up all four of their dice in a single turn they may immediately take another four from the unused ones, randomize them and *continue their current turn*. If at any stage this results in a spiral being completed this ends their turn, effectively forfeiting as described in the first case (i.e. drawing new dice until they have 4 again, and randomizing only the newly added ones). The points this player obtains are calculated as described in the previous section.

Even though it will be up to the players to decide the game ends after a certain amount of spirals are completed. This may occur quite rapidly - sometimes even before a player has had the chance to play a turn in the same round. As such I would recommend a number reasonable in the context of the present players' competence in playing Negen.

# Have fun!