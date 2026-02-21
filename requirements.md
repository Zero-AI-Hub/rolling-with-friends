I want a web page used to do dice rolls in a game with multiple people. But the page must be static, so it must use some technology as WebRTC to communicate between the players. I'll follow up detailing all the functional and technical requirements.

Functional requirements:
- The page will have three main pages. The first one to either create a room (as a DM) or to join. The second one will be the DM screen (with more functionality), and the last the player screen.
- The DM can establish a room name and his own nick. The users can enter the ID of the room and their nick. All users can select a profile picture to show their characters along their name.
- The users can throw any kind of die. The page should show defautl buttons for d2, d4, d6, d8, d10, d12, d20 and d100. And there must be an extra option for rolls of other kinds of dice. In one roll you can roll any number of dice of any kind of die. For example, 3d20 and 2d4. or 1d3 and 1d9.
- The critical hit and critical fail should have a colour highlight (green for hit and red for fail).
- The DM can see all the rolls of all the players always.
- All users can choose between doing a public roll or a private one, and they can select who sees their dice (the DM can select only him seeing, but the player rolls will be always be shown to the DM).
- The layout of the screen would be something like a pool of all the players on the uppwer side, where their rolls will be shown (and also the addition of all the dice rolled in that turn). On the bottom there should be the dice roller.
- There should be a button to show or hide an extra window with the history of rolls (only the DM can clear that history).
- The DM screen should have an extra panel to manage the room (kick players, etc), that can be hidden or shown.
- The page should be responsive and work on mobile devices.
- When rolling dice, the dice should have a small sound.
- The rolls will be kept on the "table", and the player can choose to clear their part of the table. They can also configure autoclear so the next roll clears their table before rolling. The DM should be able to clear any player's table or the whole table.

Technical requirements:
- The page should use WebRTC or a similar techonlogy to communicate between players. I recommend using PeerJS to communicate the players.
- The page should be totally static and should be able to be easily uploaded to github pages (or similar).
- The architecture should be star shaped. The DM will be the host and the players will connect to the DM.
- The page should be built using vanilla javascript, html and css.
- The page should have a fallback mechanism on the DM side to recover the data from the last game if the DM disconnects and reconnects. The players can reconnect with the same name and they should be recognised.
- The rolls must be done on the DM side to avoid cheating. The players should only send the command to roll the dice, and the DM should do the roll and send the result to the players (only the ones that can see that roll).
- The page should use a service like peerjs.com to establish the connection between players.

Some extra details:
- Please, before starting to code create the git repository with the required gitignore, license (MIT) and readme with details on what it does, how it works and the architecture. (For the git user use the system default one).
- You should do automated tests
- The page should be responsive.
- The project should be easy to maintain and extend.
- The page should be easy to deploy to github pages (or similar).

Enhancements:
- Add multiple languages
- Be able to change user name and profile picture
- Add dice picture to buttons
- Improve roll aesthetics
- Improve redability by having rolls of different die sizes ordered vertically
- Remember the last kind of dice rolled so the user can just press the button to roll again
- Let clear just one kind of die clicking on them on the roll queue
- Remember the last visibility setting
- Add options to enable or disable remembering last roll and remembering last visibility setting
- Add options so the DM can change what is a critical hit and a critical fail (default is 20 and 1)
