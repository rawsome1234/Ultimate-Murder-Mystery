"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { CustomForm, ModalFormData, ObservableBoolean, ObservableNumber } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { NeutralIndependentRole } from "./neutral_independent";
import { ScoreboardManager } from "../scoreboard_manager";
import { RoleManager } from "../role_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { Util } from "../util";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class TycoonRole extends NeutralIndependentRole {

    static COINS_ON_MAP_PROPERTY = "currentSpawnedCoins";
    static BIG_COINS_ON_MAP_PROPERTY = "currentSpawnedBigCoins";
    static CURRENT_COIN_SCOREBOARD = "role_settings.tycoon.shop_cooldown";
    static COIN_SPAWN_TIME_SCOREBOARD = "role_settings.tycoon.coin_spawn_frequency"; // time until it spawns
    
    static PURCHASED_ITEMS_PROPERTY = "purchasedItems";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        system.runInterval(TycoonRole._runCoinTimers, 1);
        system.runInterval(TycoonRole._spawnCoinParticles, 20);
        
        if (!DeathHandler.onDeathSignal.isConnected(TycoonRole.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(TycoonRole.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * 
     * @param {Player} playerWhoDied 
     * @param {Player} killer 
     */
    static onPlayerDeath(playerWhoDied, killer) {
        let playerWhoDiedRole = RoleManager.getPlayerRole(playerWhoDied);
        if (killer != null && playerWhoDiedRole != null && playerWhoDiedRole.getRoleType() == RoleTypes.TYCOON) {
            TycoonRole.givePlayerTycoonKillBuffs(killer, playerWhoDied, false);
        }
    }

    static _runCoinTimers() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }

        let allPlayers = world.getAllPlayers();
        let tycoons = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TYCOON);

        tycoons.forEach((ty) => {
            let coinTimer = ScoreboardManager.getScoreboardObjective(ty, TycoonRole.COIN_SPAWN_TIME_SCOREBOARD);
            ScoreboardManager.addScoreboardObjective(ty, TycoonRole.COIN_SPAWN_TIME_SCOREBOARD, -1);

            if (coinTimer == 1) {
                // spawn a coin
                let otherLivingPlayers = PlayerHandler.getLivingPlayers(allPlayers).filter((pl) => pl.id != ty.id);
                if (otherLivingPlayers.length == 0) {
                    ty.sendMessage("§6§oThere are no living players to continue spawning coins!");
                    return;
                }
                let randomPlayer = otherLivingPlayers[ScoreboardManager.rollRandomNumber(0, otherLivingPlayers.length)];
                TycoonRole.addNewCoin(ty, PlayerHandler.addVectors(randomPlayer.getHeadLocation(), {x:0, y:0, z:0}));
                ScoreboardManager.setScoreboardObjective(ty, TycoonRole.COIN_SPAWN_TIME_SCOREBOARD, Math.max(5, TycoonRole.getCoinSpawnTime(ty)) * 20);
            }

            let coinLocations = TycoonRole.getCoinLocations(ty);
            if (coinLocations.length > 0) {
                let coinsCollected = 0;
                for (let i = 0; i < coinLocations.length; i++) {
                    let coin = coinLocations[i];
                    if (PlayerHandler.distanceBetweenLocations(ty.getHeadLocation(), coin) < 1.5 || PlayerHandler.distanceBetweenLocations(ty.location, coin) < 1.5) {
                        coinsCollected += 1;
                        TycoonRole.pickUpCoin(ty, i);
                        coinLocations.splice(i, 1);
                        i--;
                    }
                }
                
                if (coinsCollected > 0) {
                    let coinValue = TycoonRole.getCoinValue(ty);
                    let coinsToGive = coinValue*coinsCollected;
                    ty.sendMessage("§6§oCollected " + coinsCollected + " coins, netting +" + coinsToGive + " coins.");
                    ScoreboardManager.addScoreboardObjective(ty, TycoonRole.CURRENT_COIN_SCOREBOARD, coinsToGive);
                    SoundManager.playSoundEffect([ty], SoundEffectType.TYCOON_COIN_COLLECT);
                }
            }
            let bigCoinLocations = TycoonRole.getBigCoinLocations(ty);
            if (bigCoinLocations.length > 0) {
                let coinsCollected = 0;
                for (let i = 0; i < bigCoinLocations.length; i++) {
                    let coin = bigCoinLocations[i];
                    if (PlayerHandler.distanceBetweenLocations(ty.getHeadLocation(), coin) < 1.5 || PlayerHandler.distanceBetweenLocations(ty.location, coin) < 1.5) {
                        coinsCollected += 1;
                        TycoonRole.pickUpBigCoin(ty, i);
                        bigCoinLocations.splice(i, 1);
                        i--;
                    }
                }
                
                if (coinsCollected > 0) {
                    let coinValue = Math.ceil(TycoonRole.getCoinValue(ty) * 1.5);
                    let coinsToGive = coinValue*coinsCollected;
                    ty.sendMessage("§t§oCollected " + coinsCollected + " big coins, netting +" + coinsToGive + " coins.");
                    ScoreboardManager.addScoreboardObjective(ty, TycoonRole.CURRENT_COIN_SCOREBOARD, coinsToGive);
                    SoundManager.playSoundEffect([ty], SoundEffectType.TYCOON_COIN_COLLECT);
                }
            }
        });
    }

    static _spawnCoinParticles() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }

        let allPlayers = world.getAllPlayers();
        let tycoons = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.TYCOON);

        let coinSettings = new MolangVariableMap();
        coinSettings.setColorRGBA('variable.color', {red:249/255, green: 194/255, blue: 43/255, alpha: 1});
        coinSettings.setFloat('variable.dust_lifetime', 1);

        let bigCoinSettings = new MolangVariableMap();
        bigCoinSettings.setColorRGBA('variable.color', {red:77/255, green: 155/255, blue: 230/255, alpha: 1});
        bigCoinSettings.setFloat('variable.dust_lifetime', 1);

        tycoons.forEach((ty) => {
            let coinLocations = TycoonRole.getCoinLocations(ty);
            coinLocations.forEach((coin) => {
                try {
                    ty.spawnParticle("umm:line_draw", coin, coinSettings);
                }
                catch (e) {
                }
            });
            let bigCoinLocations = TycoonRole.getBigCoinLocations(ty);
            bigCoinLocations.forEach((coin) => {
                ty.spawnParticle("umm:line_draw", coin, bigCoinSettings);
            });
        });
    }

    /**
     * 
     * @param {Player} tycoon 
     * @param {number} index The index of the coin to pick up
     */
    static pickUpCoin(tycoon, index) {
        let currentLocations = TycoonRole.getCoinLocations(tycoon);
        currentLocations.splice(index, 1);
        tycoon.setDynamicProperty(TycoonRole.COINS_ON_MAP_PROPERTY, JSON.stringify(currentLocations));
    }

    /**
     * 
     * @param {Player} tycoon 
     * @param {number} index The index of the big coin to pick up
     */
    static pickUpBigCoin(tycoon, index) {
        let currentLocations = TycoonRole.getBigCoinLocations(tycoon);
        currentLocations.splice(index, 1);
        tycoon.setDynamicProperty(TycoonRole.BIG_COINS_ON_MAP_PROPERTY, JSON.stringify(currentLocations));
    }

    /**
     * 
     * @param {Player} tycoon 
     * @returns {Vector3[]}
     */
    static getCoinLocations(tycoon) {
        return JSON.parse(tycoon.getDynamicProperty(TycoonRole.COINS_ON_MAP_PROPERTY));
    }

    /**
     * 
     * @param {Player} tycoon 
     * @returns {Vector3[]}
     */
    static getBigCoinLocations(tycoon) {
        return JSON.parse(tycoon.getDynamicProperty(TycoonRole.BIG_COINS_ON_MAP_PROPERTY));
    }

    /**
     * 
     * @param {Player} tycoon 
     * @param {Vector3} location 
     */
    static addNewCoin(tycoon, location) {
        let bigCoinChance = TycoonRole.getBigCoinChance(tycoon);
        let isBigCoin = ScoreboardManager.rollRandomNumber(0, 100) < bigCoinChance;
        if (!isBigCoin) {
            let currentLocations = TycoonRole.getCoinLocations(tycoon);
            currentLocations.push(location);
            tycoon.setDynamicProperty(TycoonRole.COINS_ON_MAP_PROPERTY, JSON.stringify(currentLocations));
        }
        else {
            let currentLocations = TycoonRole.getBigCoinLocations(tycoon);
            currentLocations.push(location);
            tycoon.setDynamicProperty(TycoonRole.BIG_COINS_ON_MAP_PROPERTY, JSON.stringify(currentLocations));
        }

        if (TycoonRole.hasPurchasedItem(tycoon, ShopItems.NEW_COIN_SPAWN_PASSIVE)) {
            let coinColor = {red:247/255,green:150/255,blue:23/255,alpha:1};
            let colorCode = "6";
            if (isBigCoin) {
                colorCode = "t";
                coinColor = {red:77/255, green: 155/255, blue: 230/255, alpha: 1};
            }
            SoundManager.playSoundEffect([tycoon], SoundEffectType.TYCOON_COIN_SPAWN);
            tycoon.sendMessage("§" + colorCode + "§oA new coin has spawned...");
            PlayerHandler.spawnParticlesBetweenPoints(tycoon, tycoon.location, location, coinColor, 3, false);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.shop_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(TycoonRole.PURCHASED_ITEMS_PROPERTY, "[]");
        player.setDynamicProperty(TycoonRole.COINS_ON_MAP_PROPERTY, "[]");
        player.setDynamicProperty(TycoonRole.BIG_COINS_ON_MAP_PROPERTY, "[]");
        ScoreboardManager.setScoreboardObjective(player, TycoonRole.CURRENT_COIN_SCOREBOARD, 0);
        ScoreboardManager.setScoreboardObjective(player, TycoonRole.COIN_SPAWN_TIME_SCOREBOARD, TycoonRole.getCoinSpawnTime(player) * 20);
        super.giveToPlayer(player);
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§6Tycoon";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Accumulate wealth and buy powerups to win!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        let winIfAlive = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_if_alive_by_default") != 0;
        let winText = winIfAlive ? "be alive or purchase the win item in the shop to win even if dead" : "purchase the win item in the shop and stay alive"
        return "Coins will periodically spawn on other players. Find these coins to buy stuff from the shop, which will let you get more coins or get coins easier. To win, you must " + winText + ".";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.tycoon.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.TYCOON;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        TycoonRole.givePlayerTycoonKillBuffs(guesser, guessedPlayer, true);
        return false;
    }

    /**
     * 
     * @param {Player} player 
     * @param {boolean} isGuess 
     */
    static givePlayerTycoonKillBuffs(player, tycoon, isGuess) {
        let killGivesEffects = ScoreboardManager.getTrackedObjective("role_settings.tycoon.tycoon_kill_gives_effects");
        let playerRole = RoleManager.getPlayerRole(player);
        if (killGivesEffects != 0 && killGivesEffects && playerRole != null && (isGuess || killGivesEffects == 2)) {
            let alignment = playerRole.getAlignment();
            let statusMessage = "";
            if (alignment.is_killer) {
                // +2 double hit uses
                ScoreboardManager.addScoreboardObjective(player, PlayerHandler.DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD, 2);
                statusMessage = "+2 double damage hits";
            }
            else {
                // give medic
                let tycoonID = ScoreboardManager.getPlayerID(tycoon);
                player.addTag("hasMedic" + tycoonID);
                statusMessage = "medic status";
            }

            let tycoonCoins = ScoreboardManager.getScoreboardObjective(tycoon, TycoonRole.CURRENT_COIN_SCOREBOARD);
            player.sendMessage("§6§oYou hear " + tycoonCoins + " coins drop on the ground, as you gain " + statusMessage + ".");
            ChatManager.sendDeadPlayersMessage("§6§o" + player.name + " gained " + statusMessage + " from killing " + tycoon.name, LogItemType.ABILITY_MESSAGE);
        }
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return true;
    }

    /**
     * Whether the item can be seen in the shop
     * @param {Player} tycoon 
     * @param {ShopItems} shopItem 
     * @returns {boolean}
     */
    static isItemAvailable(tycoon, shopItem) {
        let purchased = TycoonRole._readPurchasedItemsTag(tycoon);
        return purchased.includes(shopItem.requires) || shopItem.requires < 0;
    }

    /**
     * Whether the item can be purchased in the list.
     * @param {Player} tycoon 
     * @param {ShopItems} shopItem 
     * @returns {boolean}
     */
    static isItemPurchaseable(tycoon, shopItem) {
        let purchased = TycoonRole._readPurchasedItemsTag(tycoon);
        let requirementsMet = (purchased.includes(shopItem.requires) || shopItem.requires < 0);
        let stillAvailable = (!shopItem.one_time_purchase || !purchased.includes(shopItem.id));
        let startWithDetect = ScoreboardManager.getTrackedObjective("role_settings.tycoon.start_with_detect_coin_ability") != 0;
        let detectFlag = shopItem.id != ShopItems.DETECT_LINES_ABILITY.id || !startWithDetect;
        return requirementsMet && stillAvailable && detectFlag;
    }

    static hasPurchasedWinItem(tycoon) {
        return TycoonRole.hasPurchasedItem(tycoon, ShopItems.WIN_GAME);
    }

    /**
     * 
     * @param {Player} tycoon 
     * @param {ShopItems} shopItem 
     */
    static hasPurchasedItem(tycoon, shopItem) {
        return TycoonRole._readPurchasedItemsTag(tycoon).includes(shopItem.id);
    }

    /**
     * 
     * @param {Player} tycoon 
     * @param {ShopItems} shopItem 
     */
    static purchaseItem(tycoon, shopItem) {
        switch (shopItem.id) {
            case ShopItems.SUPER_ARMOR_CHARGE.id:
                ScoreboardManager.addScoreboardObjective(tycoon, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD, 1);
                break;
            case ShopItems.BRAGGING_RIGHTS_COST.id:
                ChatManager.sendDeadPlayersMessage("§6§lLet it be immortalized in UMM history that §r§t§l" + tycoon.name + "§r§6§l is the ultimate Tycoon!", LogItemType.ABILITY_MESSAGE);
                break;
            default:
                break;
        }

        let tag = TycoonRole._readPurchasedItemsTag(tycoon);
        tag.push(shopItem.id);
        tycoon.setDynamicProperty(TycoonRole.PURCHASED_ITEMS_PROPERTY, JSON.stringify(tag));
    }

    /**
     * 
     * @param {Player} tycoon 
     * @returns {number[]}
     */
    static _readPurchasedItemsTag(tycoon) {
        return JSON.parse(tycoon.getDynamicProperty(TycoonRole.PURCHASED_ITEMS_PROPERTY));
    }

    static getShopItems() {
        return [ShopItems.DETECT_LINES_ABILITY, ShopItems.COIN_VALUE_UP_ONE, ShopItems.COIN_VALUE_UP_TWO, ShopItems.SPAWN_RATE_UP_ONE, ShopItems.SPAWN_RATE_UP_TWO, ShopItems.NEW_COIN_SPAWN_PASSIVE, ShopItems.BIG_COIN_CHANCE, ShopItems.SUPER_ARMOR_CHARGE, ShopItems.WIN_GAME, ShopItems.BRAGGING_RIGHTS_COST];
    }

    /**
     * 
     * @param {ShopItems} shopItem 
     */
    static getDescription(tycoon, shopItem) {
        let currentVal = 0;
        let valChange = 0;
        let textToReplace = "";
        switch (shopItem.id) {
            case ShopItems.COIN_VALUE_UP_ONE.id:
                currentVal = TycoonRole.getCoinValue(tycoon);
                valChange = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_one_increase");
                textToReplace = "(" + currentVal + " -> " + (currentVal + valChange) + ")";
                return shopItem.item_desc.replace("{x}", valChange).replace("{c}", textToReplace);
            case ShopItems.COIN_VALUE_UP_TWO.id:
                currentVal = TycoonRole.getCoinValue(tycoon);
                valChange = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_two_increase");
                textToReplace = "(" + currentVal + " -> " + (currentVal + valChange) + ")";
                return shopItem.item_desc.replace("{x}", valChange).replace("{c}", textToReplace);
            case ShopItems.SPAWN_RATE_UP_ONE.id:
                currentVal = TycoonRole.getCoinSpawnTime(tycoon);
                valChange = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_one_increase");
                textToReplace = "(" + currentVal + " -> " + (currentVal - valChange) + ")";
                return shopItem.item_desc.replace("{x}", valChange).replace("{c}", textToReplace);
            case ShopItems.SPAWN_RATE_UP_TWO.id:
                currentVal = TycoonRole.getCoinSpawnTime(tycoon);
                valChange = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_two_increase");
                textToReplace = "(" + currentVal + " -> " + (currentVal - valChange) + ")";
                return shopItem.item_desc.replace("{x}", valChange).replace("{c}", textToReplace);
            case ShopItems.BIG_COIN_CHANCE.id:
                currentVal = TycoonRole.getBigCoinChance(tycoon);
                valChange = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_increase");
                textToReplace = "(" + currentVal + " -> " + (currentVal + valChange) + ")";
                return shopItem.item_desc.replace("{x}", valChange).replace("{c}", textToReplace);
            default:
                return shopItem.item_desc;
        }
    }

    /**
     * 
     * @param {Player} tycoon 
     * @returns {number} the chance for a big coin to spawn
     */
    static getBigCoinChance(tycoon) {
        let purchased = TycoonRole._readPurchasedItemsTag(tycoon);
        let total = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance");
        if (purchased.includes(ShopItems.BIG_COIN_CHANCE.id)) {
            total += ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_increase");
        }
        return total;
    }
    
    /**
     * 
     * @param {Player} tycoon 
     * @returns {number} the number of seconds for coins to currently spawn
     */
    static getCoinSpawnTime(tycoon) {
        let purchased = TycoonRole._readPurchasedItemsTag(tycoon);
        let total = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_frequency");
        if (purchased.includes(ShopItems.SPAWN_RATE_UP_ONE.id)) {
            total -= ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_one_increase");
        }
        if (purchased.includes(ShopItems.SPAWN_RATE_UP_TWO.id)) {
            total -= ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_two_increase");
        }
        return total;
    }
    
    /**
     * 
     * @param {Player} tycoon 
     * @returns {number} the number of coins a coin object should give
     */
    static getCoinValue(tycoon) {
        let purchased = TycoonRole._readPurchasedItemsTag(tycoon);
        let total = 1;
        if (purchased.includes(ShopItems.COIN_VALUE_UP_ONE.id)) {
            total += ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_one_increase");
        }
        if (purchased.includes(ShopItems.COIN_VALUE_UP_TWO.id)) {
            total += ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_two_increase");
        }
        return total;
    }

    /**
     * 
     * @param {Player} tycoon 
     * @returns 
     */
    static hasDetectAbility(tycoon) {
        let startWithDetect = ScoreboardManager.getTrackedObjective("role_settings.tycoon.start_with_detect_coin_ability") != 0;
        return TycoonRole.hasPurchasedItem(tycoon, ShopItems.DETECT_LINES_ABILITY) || startWithDetect;
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     * @param {Player} player 
     */
    activateAbility(player) {
        // open shop
        if (player.isSneaking && TycoonRole.hasDetectAbility(player)) {
            let coinLocations = TycoonRole.getCoinLocations(player);
            let bigCoinLocations = TycoonRole.getBigCoinLocations(player);
            if (coinLocations.length > 0 || bigCoinLocations.length > 0) {
                player.sendMessage("§6§oShowing all coin locations!");
                coinLocations.forEach((coin) => {
                    PlayerHandler.spawnParticlesBetweenPoints(player, player.location, coin, {red:247/255,green:150/255,blue:23/255,alpha:1}, 5, false);
                });
                bigCoinLocations.forEach((coin) => {
                    PlayerHandler.spawnParticlesBetweenPoints(player, player.location, coin, {red:77/255, green: 155/255, blue: 230/255, alpha: 1}, 5, false);
                });
            }
            else {
                player.sendMessage("§6§oThere are no coins on the map.");
            }

            // player.sendMessage(player.getDynamicProperty(TycoonRole.PURCHASED_ITEMS_PROPERTY)); 
            ChatManager.sendDeadPlayersMessage("§6§o" + player.name + " detected the coins on the map.", LogItemType.ABILITY_MESSAGE);

            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.detect_coin_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            return;
        }

        let currentCoins = ScoreboardManager.getScoreboardObjective(player, TycoonRole.CURRENT_COIN_SCOREBOARD);

        // ability effect
        let form = new CustomForm(player, "§6Tycoon Shop");

        form.divider();
        form.label("§oCurrent Coins: " + currentCoins);
        form.spacer();

        let items = TycoonRole.getShopItems();
        let available = items.filter((i) => TycoonRole.isItemAvailable(player, i));
        let purchaseables = items.filter((i) => TycoonRole.isItemPurchaseable(player, i));

        available.forEach((av) => {
            // let obvString = new ObservableString("");
            let coinCost = ScoreboardManager.getTrackedObjective(av.cost_scoreboard);
            let purchaseable = TycoonRole.isItemPurchaseable(player, av);
            let colorCode = purchaseable ? (coinCost > currentCoins ? "e" : "a") : "c"
            let coinCostText = !purchaseable ? "bought!" : coinCost + " coins"
            form.label("§" + colorCode + av.item_name + " - " + coinCostText, {});
            form.spacer();
        });

        let canMultibuy = ScoreboardManager.getTrackedObjective("role_settings.tycoon.can_multibuy") != 0;
        if (canMultibuy) {
            // individual toggles
            let disabledBooleans = [];
            let toggleStates = [];
            purchaseables.forEach((av) => {
                let cost = ScoreboardManager.getTrackedObjective(av.cost_scoreboard);
                if (cost > currentCoins) {
                    form.toggle(av.item_name + " (" + cost + ")", new ObservableBoolean(false, {clientWritable:true}), {disabled: true});
                    return;
                }
                let disableBoolean = new ObservableBoolean(false);
                disabledBooleans.push(disableBoolean);
                let boolean = new ObservableBoolean(false, {clientWritable: true});
                boolean.subscribe((b) => {
                    let coinsSpent = toggleStates.reduce((p, c, i) => {
                        return p + (c.getData() ? ScoreboardManager.getTrackedObjective(purchaseables[i].cost_scoreboard) : 0);
                    }, 0);
                    let coinsRemaining = currentCoins - coinsSpent;
                    disabledBooleans.forEach((dis, i) => {
                        let relatedItem = purchaseables[i];
                        let itemCost = ScoreboardManager.getTrackedObjective(relatedItem.cost_scoreboard);
                        let newToggle = itemCost > coinsRemaining && !toggleStates[i].getData();
                        dis.setData(newToggle);
                    });
                });
                toggleStates.push(boolean);
                form.toggle(av.item_name + " (" + cost + ")", boolean, {disabled:disableBoolean, description: TycoonRole.getDescription(player, av)});
            });
            
            form.button("Purchase!", () => {
                form.close();
                let purchasing = toggleStates.map((state, i) => state.getData() ? purchaseables[i] : null);
                purchasing = purchasing.filter((item) => item != null);

                let spentCoins = 0;
                purchasing.forEach((item) => {
                    TycoonRole.purchaseItem(player, item);
                    spentCoins += ScoreboardManager.getTrackedObjective(item.cost_scoreboard);
                });
                
                // spend the coins
                ScoreboardManager.addScoreboardObjective(player, TycoonRole.CURRENT_COIN_SCOREBOARD, -spentCoins);

                let itemsList = Util.formatStringList(purchasing.map((item) => item.item_name), ", ", true);
                SoundManager.playSoundEffect([player], SoundEffectType.TYCOON_ITEM_PURCHASE);
                player.sendMessage("§6Purchased " + itemsList);
                ChatManager.sendDeadPlayersMessage("§6§o" + player.name + " purchased the following items: " + itemsList);

                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.shop_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            });
        }
        else {
            // dropdown
            let purchaseItem = new ObservableNumber(0, {clientWritable: true});
            let dropdownData = purchaseables.map((av, index) => {
                let cost = ScoreboardManager.getTrackedObjective(av.cost_scoreboard);
                return {label: av.item_name + " (" + cost + ")" , value: index, description: TycoonRole.getDescription(player, av)};
            });
            form.dropdown("Item to Purchase", purchaseItem, dropdownData);
            form.spacer();
        
            form.button("Purchase!", () => {
                let itemToPurchase = purchaseables[purchaseItem.getData()];
                form.close();
    
                let itemCost = ScoreboardManager.getTrackedObjective(itemToPurchase.cost_scoreboard);
                if (itemCost > currentCoins) {
                    player.sendMessage("You don't have enough coins!");
                    return;
                }
    
                ScoreboardManager.addScoreboardObjective(player, TycoonRole.CURRENT_COIN_SCOREBOARD, -itemCost);
                TycoonRole.purchaseItem(player, itemToPurchase);
                
                // ability activate message
                SoundManager.playSoundEffect([player], SoundEffectType.TYCOON_ITEM_PURCHASE);
                player.sendMessage("§6Purchased " + itemToPurchase.item_name + "!");
                ChatManager.sendDeadPlayersMessage("§6§o" + player.name + " purchased " + itemToPurchase.item_name + " for " + itemCost + " coins!", LogItemType.ABILITY_MESSAGE);
    
                // sets cooldown
                let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.shop_cooldown");
                ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            });
        }

        form.show();
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        let winIfAlive = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_if_alive_by_default") != 0;
        let winItemPurchased = TycoonRole.hasPurchasedItem(player, ShopItems.WIN_GAME);
        let playerAlive = !player.hasTag("dead");

        // the player must be alive AND  the toggle is set    or they purchased the win if alive ability
        let isAliveWin = playerAlive && (winIfAlive || winItemPurchased);
        // the player only can general win if the win toggle is set and they have the win ability
        let generalWin = winIfAlive && winItemPurchased;
        return isAliveWin || generalWin;
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Tycoon Settings");

        form.divider();
        form.label("The Tycoon is a neutral independent role that needs to collect coins dropped by players in order to win. They have a shop that has various upgrades, such as making coins give more or spawning more frequently.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.tycoon.enabled") != 0;
        form.toggle("Tycoon Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let coinSpawnFrequency = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_frequency");
        form.slider("Coin Spawn Frequency", 15, 180, { valueStep: 5, defaultValue: coinSpawnFrequency })
        form.label("The number of seconds before a new coin spawns. Coins are local to each tycoon and will spawn on a random other player's location.");
        // 6
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.tycoon.shop_cooldown");
        form.slider("Shop Cooldown", 0, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown after using the shop before it can be used again.");
        
        let canMultibuy = ScoreboardManager.getTrackedObjective("role_settings.tycoon.can_multibuy") != 0;
        form.toggle("Can Multibuy", { defaultValue: canMultibuy }); // 8
        form.label("If true, the Tycoon can purchase multiple items at once from the shop.");
        
        let killGivesEffectsOptions = ["Off", "On Guess", "Always"];
        let killGivesEffects = ScoreboardManager.getTrackedObjective("role_settings.tycoon.tycoon_kill_gives_effects");
        form.dropdown("Killing Tycoon Gives Effects", killGivesEffectsOptions, { defaultValueIndex: killGivesEffects }); // 10
        form.label("If on, killing the tycoon will give players positive effects. Killers will get +2 Double Damage hits and innocents will gain the Medic status. On Guess will only give the buffs when the tycoon is guessed.");
        
        let startWithDetect = ScoreboardManager.getTrackedObjective("role_settings.tycoon.start_with_detect_coin_ability") != 0;
        form.toggle("Start with Detect Coins", { defaultValue: startWithDetect }); // 12
        form.label("If true, the Tycoon will start with detect coins and it will not be in the shop. Detect lets the tycoon crouch + ability to get the location of all coins.");
        
        let detectCoinCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.detect_coin_cooldown");
        form.slider("Detect Coins Cooldown", 0, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: detectCoinCooldown }) // 14
        form.label("The cooldown time in seconds of the detect coins ability.");
        
        let startingCoinValue = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_starting_value");
        form.slider("Starting Coin Value", 1, 10, { defaultValue: startingCoinValue }) // 16
        form.label("The initial value of coins.");
        
        let bigCoinChance = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance");
        form.slider("Big Coin Chance", 5, 50, { valueStep: 5, defaultValue: bigCoinChance })// 18
        form.label("The default chance to get a big coin (x2 coins).");

        let valueOneIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_one_increase");
        form.slider("Coin Value Lvl 1 Amount", 1, 10, { defaultValue: valueOneIncrease }); // 20
        form.label("The number of additional coins a coin will give upon buying Coin Value Up 1");
        
        let valueTwoIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_two_increase");
        form.slider("Coin Value Lvl 2 Amount", 1, 10, { defaultValue: valueTwoIncrease }); // 6
        form.label("The number of additional coins a coin will give upon buying Coin Value Up 2");
        
        let freqOneIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_one_increase");
        form.slider("Spawn Frequency Up Lvl 1 Amount", 5, 120, { valueStep: 5, defaultValue: freqOneIncrease }); // 6
        form.label("The number of seconds the spawn frequency will be decreased by. Cannot go below 5 seconds.");
        
        let freqTwoIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_two_increase");
        form.slider("Spawn Frequency Up Lvl 2 Amount", 5, 120, { valueStep: 5, defaultValue: freqTwoIncrease }); // 6
        form.label("The number of seconds the spawn frequency will be decreased by. Cannot go below 5 seconds.");
        
        let bigCoinChanceUp = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_increase");
        form.slider("Big Coin Chance Up Amount", 5, 100, { valueStep: 5, defaultValue: bigCoinChanceUp }); // 6
        form.label("The percent chance increase for a big coin to spawn. Capped at 100");
        
        let winIfAlive = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_if_alive_by_default") != 0;
        form.toggle("Default Win if Alive", { defaultValue: winIfAlive }); // 6
        form.label("If true, the tycoon will win as long as they are alive. The win item in the shop will let them win even if they're not alive.");
        
        let detectCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.detect_coins_cost");
        form.slider("Detect Coins Cost", 5, 100, { valueStep: 5, defaultValue: detectCost })
        form.label("The coin cost of detect coins in the shop.");
        
        let coinValueOneCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_value_up_one_cost");
        form.slider("Coin Value + (Lvl 1) Cost", 5, 100, { valueStep: 5, defaultValue: coinValueOneCost })
        form.label("The coin cost of coin value up level 1 in the shop.");
        
        let coinValueTwoCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_value_up_two_cost");
        form.slider("Coin Value + (Lvl 2) Cost", 5, 100, { valueStep: 5, defaultValue: coinValueTwoCost })
        form.label("The coin cost of coin value up level 2 in the shop.");
        
        let spawnFreqOneCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_one_cost");
        form.slider("Spawn Freq + (Lvl 1) Cost", 5, 100, { valueStep: 5, defaultValue: spawnFreqOneCost })
        form.label("The coin cost of coin spawn frequency up lvl 1 in the shop.");
        
        let spawnFreqTwoCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_two_cost");
        form.slider("Spawn Freq + (Lvl 2) Cost", 5, 100, { valueStep: 5, defaultValue: spawnFreqTwoCost })
        form.label("The coin cost of coin spawn frequency up lvl 2 in the shop.");
        
        let coinPassiveCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.new_coin_line_passive_cost");
        form.slider("Coin Line Passive Cost", 5, 100, { valueStep: 5, defaultValue: coinPassiveCost })
        form.label("The coin cost of the coin line passive in the shop.");
        
        let chanceUpCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_cost");
        form.slider("Big Coin Chance Up Cost", 5, 100, { valueStep: 5, defaultValue: chanceUpCost })
        form.label("The coin cost of big coin chance up in the shop.");
        
        let superArmorCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.super_armor_charge_cost");
        form.slider("Super Armor Cost", 5, 100, { valueStep: 5, defaultValue: superArmorCost })
        form.label("The coin cost of one charge of super armor in the shop. Can be bought multiple times.");
        
        let winAliveCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_alive_cost");
        form.slider("Win Cost", 5, 100, { valueStep: 5, defaultValue: winAliveCost })
        form.label("The coin cost of the win ability in the shop. If Win if Alive is true, this will let the tycoon win the game if they're alive or not.");
        
        let braggingRightsCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.bragging_rights_cost");
        form.slider("Bragging Rights Cost", 50, 200, { valueStep: 5, defaultValue: braggingRightsCost })
        form.label("The coin cost of the bragging rights item in the shop. Does nothing.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.tycoon.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_spawn_frequency", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.shop_cooldown", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.can_multibuy", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.tycoon_kill_gives_effects", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.start_with_detect_coin_ability", r.formValues[12] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.detect_coin_cooldown", r.formValues[14]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_starting_value", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.big_coin_chance", r.formValues[18]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.value_one_increase", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.value_two_increase", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.frequency_one_increase", r.formValues[24]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.frequency_two_increase", r.formValues[26]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.big_coin_chance_up_increase", r.formValues[28]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.win_if_alive_by_default", r.formValues[30] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.detect_coins_cost", r.formValues[32]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_value_up_one_cost", r.formValues[34]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_value_up_two_cost", r.formValues[36]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_one_cost", r.formValues[38]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_two_cost", r.formValues[40]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.new_coin_line_passive_cost", r.formValues[42]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.big_coin_chance_up_cost", r.formValues[44]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.super_armor_charge_cost", r.formValues[46]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.win_alive_cost", r.formValues[48]);
            ScoreboardManager.setTrackedObjective("role_settings.tycoon.bragging_rights_cost", r.formValues[50]);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let coinSpawnFrequency = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_frequency");
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.tycoon.shop_cooldown");
        let canMultibuy = ScoreboardManager.getTrackedObjective("role_settings.tycoon.can_multibuy") != 0;
        let killGivesEffectsOptions = ["Off", "On Guess", "Always"];
        let killGivesEffects = ScoreboardManager.getTrackedObjective("role_settings.tycoon.tycoon_kill_gives_effects");
        let startWithDetect = ScoreboardManager.getTrackedObjective("role_settings.tycoon.start_with_detect_coin_ability") != 0;
        let detectCoinCooldown = ScoreboardManager.getTrackedObjective("role_settings.tycoon.detect_coin_cooldown");
        let startingCoinValue = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_starting_value");
        let bigCoinChance = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance");
        let valueOneIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_one_increase");
        let valueTwoIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.value_two_increase");
        let freqOneIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_one_increase");
        let freqTwoIncrease = ScoreboardManager.getTrackedObjective("role_settings.tycoon.frequency_two_increase");
        let bigCoinChanceUp = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_increase");
        let winIfAlive = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_if_alive_by_default") != 0;
        let detectCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.detect_coins_cost");
        let coinValueOneCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_value_up_one_cost");
        let coinValueTwoCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_value_up_two_cost");
        let spawnFreqOneCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_one_cost");
        let spawnFreqTwoCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.coin_spawn_freq_up_two_cost");
        let coinPassiveCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.new_coin_line_passive_cost");
        let chanceUpCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.big_coin_chance_up_cost");
        let superArmorCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.super_armor_charge_cost");
        let winAliveCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.win_alive_cost");
        let braggingRightsCost = ScoreboardManager.getTrackedObjective("role_settings.tycoon.bragging_rights_cost");

        let description = "The Tycoon is a neutral independent that must accumulate wealth to win. Coins spawn on other players during the game, which the tycoon can pickup to purchase items in a shop, including the ability to win.";
        description += "\n\nCoin Spawn Time: " + coinSpawnFrequency + " seconds.";
        description += "\nShop Ability Cooldown: " + cooldownTime + " seconds.";
        description += "\nCan Multibuy: " + canMultibuy;
        description += "\nKilling Tycoon Gives Effects: " + killGivesEffectsOptions[killGivesEffects];
        description += "\nStart with Detect Coins: " + startWithDetect;
        description += "\nDetect Cooldown: " + detectCoinCooldown + " seconds.";
        description += "\nCoin Starting Value: " + startingCoinValue + " coins.";
        description += "\nBig Coin Starting Chance: " + bigCoinChance;
        description += "\nCoin Value 1 Increase: " + valueOneIncrease;
        description += "\nCoin Value 2 Increase: " + valueTwoIncrease;
        description += "\nCoin Freq 1 Increase: " + freqOneIncrease;
        description += "\nCoin Freq 2 Increase: " + freqTwoIncrease;
        description += "\nBig Coin Chance Increase: " + bigCoinChanceUp;
        description += "\nWin if Alive by Default: " + winIfAlive;
        description += "\nDetect Cost: " + detectCost;
        description += "\nCoin Value Lvl 1 Cost: " + coinValueOneCost;
        description += "\nCoin Value Lvl 2 Cost: " + coinValueTwoCost;
        description += "\nCoin Freq Lvl 1 Cost: " + spawnFreqOneCost;
        description += "\nCoin Freq Lvl 2 Cost: " + spawnFreqTwoCost;
        description += "\nNew Coin Passive Cost: " + coinPassiveCost;
        description += "\nBig Coin Chance Up Cost: " + chanceUpCost;
        description += "\nSuper Armor Cost: " + superArmorCost;
        description += "\nWin Cost: " + winAliveCost;
        description += "\nBragging Rights Cost: " + braggingRightsCost;
        return description;
    }
}

export const ShopItems = Object.freeze({
    DETECT_LINES_ABILITY: { id: 0, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.detect_coins_cost", requires: -1, item_name: "Detect Lines Ability", item_desc: "Crouch + Click to see all coins on the map." },
    COIN_VALUE_UP_ONE: { id: 1, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.coin_value_up_one_cost", requires: -1, item_name: "Coin Value Up (lvl 1)", item_desc: "Coins give {x} more coins {c}." },
    COIN_VALUE_UP_TWO: { id: 2, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.coin_value_up_two_cost", requires: 1, item_name: "Coin Value Up (lvl 2)", item_desc: "Coins give {x} more coins {c}." },
    SPAWN_RATE_UP_ONE: { id: 3, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.coin_spawn_freq_up_one_cost", requires: -1, item_name: "Spawn Rate Up (Lvl 1)", item_desc: "Coins spawn in {x} less seconds {c}." },
    SPAWN_RATE_UP_TWO: { id: 4, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.coin_spawn_freq_up_two_cost", requires: 3, item_name: "Spawn Rate Up (Lvl 2)", item_desc: "Coins spawn in {x} less seconds {c}." },
    NEW_COIN_SPAWN_PASSIVE: { id: 5, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.new_coin_line_passive_cost", requires: -1, item_name: "Line on Coin Spawn", item_desc: "A line will show where a new coin is." },
    SUPER_ARMOR_CHARGE: { id: 6, one_time_purchase: false, cost_scoreboard: "role_settings.tycoon.super_armor_charge_cost", requires: -1, item_name: "+1 Super Armor", item_desc: "Gain +1 Super Armor Use." },
    WIN_GAME: { id: 7, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.win_alive_cost", requires: -1, item_name: "Win Game (if alive)", item_desc: "If you are alive when the game ends, you will win." },
    BIG_COIN_CHANCE: { id: 8, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.big_coin_chance_up_cost", requires: -1, item_name: "Big Coin Chance Up", item_desc: "Big coins have a {x}% higher chance to spawn {c}." },
    BRAGGING_RIGHTS_COST: { id: 9, one_time_purchase: true, cost_scoreboard: "role_settings.tycoon.bragging_rights_cost", requires: -1, item_name: "Bragging Rights", item_desc: "Does nothing, but extremely hard to get." },
});