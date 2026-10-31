tickingarea add 0 0 0 1 1 1 "UMMData"
setblock 0 310 0 glass
summon armor_stand "Settings" 0 311 0
execute as @e[type=armor_stand,name="Settings"] run function helpers/setup/setup_scoreboards
# unused, in the sound Manager now