# How to Play
If you're looking for a How to Play guide, there is a brief markdown document in this folder, and a more robust one in-game. For information on
    what settings do, they generally try to explain themselves fairly well, but there is also an `About` at the bottom of the `Open Settings` item.

# Installation Guide
You already have this pack downloaded so we'll skip that step.
To install, either double click the `.mcpack` file (often with Minecraft closed) and it will install in Minecraft.
    If you've previously had a version of UMM installed, you may want to delete it.

For a manual install (on Windows) with the `.zip`, unzip the file and move the entire folder to
    `\Users\<YOUR_USER>\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang\behavior_packs`
    Appdata is a hidden folder that you can navigate to by typing `%Appdata%` into the file explorer on windows.
    Mojang/Microsoft has changed how files are stored before and may change them in the future.
    Install the resource pack `.zip` into the respective `\com.mojang\resource_packs` folder.

# Adding to a World
If you're adding to an old world, click the edit button on the world. If you're making a new world, just go to the next step

## World Settings
1) Scroll down to the Behavior packs tab, find the Ultimate Murder Mystery pack, and activate it. It should appear in the Active tab. If you don't see
    the pack, make sure you're in the `Available` tab. If you still don't see it, ensure it's installed.
2) Go to the Resource packs tab and ensure the UMM Resource Pack was enabled. If it wasn't, enable it. 
    It is recommended to also enabled `Shared Packs` to make sure players have the resource pack, although it's not necessary.
3) Go to the Experiments tab and toggle on `Beta APIs` under Add-on Creators. Click Turn On Experiments anyway. You can make a backup, but it's not necessary
    (UMM needs Beta APIs to detect chat messages)
4) Make sure Cheats are on in the Cheats tab.
5) Press play

## Setup in World
While UMM comes fairly setup out of the box, there are a couple of pieces that need to be done.
It's recommended as the host to get an `Open Settings` item out of the Creative Inventory for hosting purposes.
Before the game can be played, there are 8 blocks that must be set with the `/set_config_block` command. Those blocks are the following:
1) Book Dispenser (book_dispenser) - If Role Assignment is Dispenser, role books will be placed in here
2) Book Hopper (book_hopper) - If there are more than 9 people, extra books go in the hopper. There must be an empty block above the hopper for 14+ players
3) Weapons Chest (weapons_chest) - Any container (chest, barrel, etc) for weapons to be gotten from.
4) Player Spawn Position (respawn_pos) - The place players spawn. Moves world spawn and sets spawn
5) Player Location (player_play_block) - Where players can enter adventure mode from spectating
6) Spectate Location (player_spectate) - Where players can enter spectator mode from being in adventure
7) Reset Dispenser Button (reset_dispenser_button) - This button fills the dispenser with books
8) Start Lever (start_lever) - This will start the game. If Role Assignment is Dispenser, it will search players for role books. If assignment is Automatic, it'll give players roles.

These blocks can be set with `/set_config_block <block_name> <block_location>`. If you look at a block and then press tab on keyboard, you can autofill
    the block you're looking at for the block location. Tab will also autofill the block name from the given list.

If you're unsure what blocks you haven't set, typing `!missing` into chat will give a message telling you what hasn't been set

## Playing
To start a round, press the Reset Dispenser Button. This will fill the dispenser with books, one for every online player. 
    Everyone can get a book out of the dispenser. When the dispenser gets emptied, a notification will be sent. When everyone has their book, flick the Start Lever
    to start the game. Everyone will then get a notification in chat and on-screen that their role has been assigned and you may play.

If books aren't your speed, you can go into the `Open Settings` item and navigate to `Game Settings -> Role Assignment` and change the assignment type to Automatic.
    If you do so, roles will be assigned when the Start Lever is pulled, regardless of what books players have.

By default, no roles are on, so players will only receive Murderer and Innocent books from the dispenser. Their are a few ways to enable roles:
- Rule Presets (recommended for new players) - If you're new to Murder Mystery/UMM, navigate to `Rule Presets`. Here there are two default
    presets. To ease into roles, I'd recommend the `Introduction to Roles` preset, which contains some simple roles to get used to them. After you have some
    experience, you can try the `Introduction to Killers` preset, which has some more complex murderer roles enabled.
- Manually Enabling Roles - If you're familiar with your favorite roles, you can individually enable roles in `Role Settings`. You can also
    change the settings of roles in Role Settings so you can customize roles you might think are over- or under-powered. I'd recommend looking at them, there's
    a lot of configuration that can wholly change how roles may work.
- Role/Modifier Randomizer - The last option in the settings is the `Role/Modifier Randomizer`. If you want to jump in, or have played with the same set of
    roles and want a shake up, you can randomize which roles are enabled based on alignment. Upon setting a number of roles to be enabled, the game will
    disable all roles of that alignment and then enable random ones until the set number has been reached.