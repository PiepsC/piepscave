
# Negen - a mathematician's game

## Game details
**Players: 3 to 4**

**Duration: variable, but intended to be around 20-30 minutes**

**Difficulty: intermediate**

**Requires: a note to keep track of the score, a lot of small (12mm) dice - preferably 60+ for 4 players**

Designed by Lars Willemsen in 2024

## Rationale

Negen is a simple game designed as a casual party game. It is strongly inspired by games like [Rummikub](https://en.wikipedia.org/wiki/Rummikub), which in turn is a straightforward example of a game relying on the concept of a *permutation explosion* to shape variations. Being innately random Negen can be quite difficult to capture even after multiple attempts at playing.

The game was initialy designed around two things: involving just dice as playing pieces and having a very minimal ruleset yet abiding by the need for a great deal of variance. Dice are fascinating because they impose much needed radnomness on a game at the lowest possible inconvenience. Everyone understands dice and [their ability to predict the future](https://www.britannica.com/topic/dice)!

| ![Negen1](content/creative/Negen/Negen.jpg) |
| :--: |
| *Negen: a deceptively simple game played with just dice!* |

## The goal

In Negen players will compete to try and complete **Spirals**. Spirals are chains of dice that seem to oppose converging. Once a spiral becomes **closed** it is considered completed (i.e. there exists a *loop* in the spiral) and the person completing it wins the round. Even though it is up to the party to decide how many rounds need to be won by a single player before the game ends, it is recommended to set it at a number no lower than 2 to battle the impact of luck and minor mistakes. Games in Negen can end very abruptly.

## Setting up and playing

In order to play Negen each participant takes 4 dice from the pool and randomizes them. These dice are placed in front of each player visible to all. From now on these dice are referred to as "*player boards*". These dice are not to be randomized again unless explicitly stated. Then, three dice are taken from the pool, randomized and placed at the center of the table. These dice constitute the currently available spirals for the starting player. During a game of Negen the goal is to add or manipulate these spirals in a way that either benefits you, or thwarts the competitors ability to take meaningful turns. The resulting table should look something like this (for three players):

| ![Negen2](content/creative/Negen/Setup.jpg) |
| :--: |
| *Setting up to play* |

During a turn players may choose to either add or refuse to add dice to an existing spiral from their board. If a player is not able to add any dice from their board this counts as a refusal. Additionally, the player may, regardless of whether they opt to add dice to a spiral or not, *connect* existing ones. These actions may occur in any order, even in interweaving fashion (i.e. first adding dice, then connecting spirals and then adding more dice). Players may never manually *introduce* **new** spirals during their turn; they may only connect existing ones or add to them. A spiral is considered new if it consists of only dice that were not part of a spiral existing at the start of a player's turn. Adding and connecting dice happens in an *orthogonal* fashion. Simply think of it as creating straight lines, but no diagonal ones! Players may freely take any dice from existing spirals as long as those spirals are still valid at the end of their turn.

A player's turn is considered *valid* if, at the end of their turn, the board consists of only *valid spirals*. This will be explained in the next section. If, at any stage during their turn, a player depletes their entire board (i.e. they used up all four dice) their turn *ends, they take four new randomized dice from the pool and begin their turn anew*. Depleting a player board is one of the main objectives in Negen, as it allows the player to very quickly complete a spiral... if their fortune agrees. If a player is unable to deplete their board before explicitly ending their turn, but did add any non-zero amount of dice to existing spirals, they simply take dice from the pool until their board consists of 4 dice again. Only the new dice are randomized! If a player did not play any die from their board before ending their turn, they may instead randomize *any* of their current dice in their board but must then also take a new die from the pool, randomize it and add it to the board as a new spiral.

Once a player manages to complete any currently available spiral by introducing a loop the round immediately ends. This player scores a point. New rounds start entirely anew as described in the beginning of this section. The youngest player in the party may initiate the first round, and each round thereafter has initiative rotate to the adjacent person in a clock-wise fashion.

## A bit about Spirals

Spirals are notorious for their unwillingness to converge. In Negen, spirals are considered valid if they abide by a specific structure. The following statement might sound complicated at first, but fear not - it will be explained visually briefly after. In Negen, a spiral is considered valid if, for some valid interpretation of **nodes and edges** in the spiral each individual die is part of a valid **sequence**, OR, they exist of just a singular die.

*Oof!* Let's start by explaining what these nodes and edges are! Nodes and edges are like two opposite poles: they attract one another but repel their own kind. Nodes and edges exist in a perfectly *orthogonally interweaving* pattern. Next to a node we may only connect edges, and next to an edge only nodes. Edges and nodes are an abstract concept used in the explanation of *sequences*. Sequences are an orthogonal connection of three dice, consisting of a node, edge and another node. Each die in the sequence may at most differ a single point value from their neighbours and the entire sequence must be *strictly increasing or decreasing*. Examples of sequences are as such: "1-2-3", "3-2-1", "6-5-4" etc. Examples of erroneous sequences would be "5-4-5" (not strictly increasing or decreasing) or "1-5-6" (not a single point difference between neighbours).

In the image below there are some depictions of both valid and erroneous spirals. For the sake of convenience an interpretation of nodes are colored *red*, while edges are colored *blue*:

| ![Negen3](content/creative/Negen/Spirals.jpg) |
| :--: |
| *A real, valid spiral, or just masquerading as one?* |

In the valid spiral example we see as many as *three* different sequences: "3-4-5", "3-4-5" and "5-4-3". Sequences are *bidirectional*, so they may be considered in the opposite direction as well! In the erroneous cases we see two different problems at play. In the first, upper example the connecting dice simply do not differ a single point from neighbour to neighbour. In the second example there exists no possible interpretation of nodes and edges that would allow each two adjacent dice to be part of the same sequence (try it!).

Lastly, besides being *valid* or not, spirals may become *completed* or *closed*. A completed spiral converges, and thus is no longer a spiral at all! This happens when a *loop* exists anywhere in the spiral's structure. A loop can be understood as interpreting each individual die in the spiral as a direction (north, east, south or west) and then trying to find a path that ends where it began. Once a player completes a spiral they win the round.

## A single turn of playing Negen

It is Piet's, our protagonist for this example, turn to play. On the center of the table are three spirals. One spiral is a singular die with the value 3, another consists of just a 1. The last spiral is a single sequence of "6-5-4". Piet's board consists of the dice 5, 2, 6 and 1. After some consideration Piet thinks that he has no chance to create a loop in any spiral as he will be unable to immediately connect to existing ones in such a fashion and is unable to use up all the dice in his board.

He also recognizes that if he can not play offensively, he must play defensively instead. The table has three spirals. Piet will try to reduce the amount of spirals for the next players by connecting them. To the spiral of the sequence "6-5-4" he can connect the free spiral consisting of just a 3 and then complete the second sequence with a 2 from his board. Unfortunately this leaves the free spiral consisting of just a 1 open. Piet reconsiders: what if he takes the 5 and 4 from the spiral consisting of "6-5-4", then connects the free spiral consisting of a 3, add a 2 from his board and then connect the remaining free spiral consisting of a 1? This would 

## Strategy

Negen is a deceptive game in that it appears childishly simple and random, but actually explodes in terms of complexity quite rapidly. In order to win players must alternate between playing *offensively* (trying to complete spirals or emptying their board) and *defensively* (trying to make sure your competitors cannot properly use their turn). Often this requires simulating other players' turns mentally before committing to your own. As such, the complexity of Negen grows with the amount of people playing the game. Below are some fundamental observations that will get you started on the right path:

- Die values closer to the "average" appear in the most sequences, making 3 and 4 especially appealing values to have on your board
- "Crossing" a sequence (i.e. introducing a directly orthogonal sequence through it) is a common defensive play
- Not playing a single die from your board is always a risky turn as it introduces a single-die spiral to the board
- ...however, if your board is truly bricked it might be your best option
- Single-die spirals are very convenient when it comes to connecting!
- Trying to connect spirals together is another common defensive play
- If things become hard to oversee, just simulate the turn of the next player, then assume they will do the same!
- Sometimes you are the only person that can prevent a victory for someone else multiple turns ahead
- Playing offensively is easy, playing defensively is much harder!

## Media

At some point Negen will have a small, simple and free Electron based application that allows people to play the game across the globe. For now this section is unfinished. You can find the mp3 (for file size constraints) of the game's theme at the following link: [Negen theme](content/creative/Negen/Negen_theme.mp3).

# Have fun!