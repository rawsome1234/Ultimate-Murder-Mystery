"use strict";

import { world, system, Player } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { PlayerHandler } from "./player_handler";

export class Util {
    /**
     * Rolls a random item based on a list of weights.
     * @param {number[]} weights a list of weights that will get rolled.
     * @returns {number} the index of the weight that was rolled. Returns -1 if no weights were inputted.
     */
    static rollWeights(weights) {
        let totalWeights = 0;
        for (let i = 0; i < weights.length; i++) {
            totalWeights += weights[i];
        }

        if (totalWeights == 0) {
            return -1;
        }
        let randomWeight = ScoreboardManager.rollRandomNumber(0, totalWeights);
        let runningTotal = 0;
        for (let i = 0; i < weights.length; i++) {
            if (runningTotal + weights[i] > randomWeight) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Rolled number " + randomWeight + ", found song using weight " + weights[i]));
                return i;
            }
            runningTotal += weights[i];
        }
        return -2;
    }

    /**
     * Removes all the § codes from the inputted string.
     * @param {String} string 
     */
    static removeColorCodes(string) {
        if (string == null) {
            return "";
        }
        if (string.indexOf("§") == -1){
            return string;
        } 
        // let newString = string;
        let pieces = string.split("§");
        // world.getAllPlayers().forEach((pl) => pl.sendMessage(JSON.stringify(pieces)));
        pieces = pieces.map((piece) => {
            if (piece.length > 0) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Returning substring (" + piece + " -> " + piece.substring(1) + ")"));
                return piece.substring(1);
            }
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Returning piece " + piece));
            return piece;
        });
        // world.getAllPlayers().forEach((pl) => pl.sendMessage(JSON.stringify(pieces)));
        return pieces.join("");
        // while (newString.indexOf("§") >= 0) {
        //     let indexOfCode = newString.indexOf("§");
        //     newString = newString.(indexOfCode, indexOfCode+2);
        // }
        // return newString;
    }

    static lerp(a, b, amount) {
        return a + (b - a) * amount
    }

    /**
     * 
     * @param {Array} list 
     */
    static shuffle(array) {
        // gotten from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
        let currentIndex = array.length;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {
            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
    }

    /**
     * 
     * @param {string[]} stringList 
     * @param {string} separator 
     * @param {boolean} includeAnd whether or not to include an "and" between the end of a list or not
     */
    static formatStringList(stringList, separator, includeAnd) {
        let fullList = "";
        for (let i = 0; i < stringList.length; i++) {
            if (includeAnd && i + 1 == stringList.length && stringList.length > 1) {
                fullList += "and ";
            }
            fullList += stringList[i];
            if (i + 1 < stringList.length) {
                fullList += separator;
            }
        }
        return fullList;
    }

    /**
     * @param {number} min
     */
    static generateRandomNumbers(min, max, numberOfNumbers) {
        let numbers = [];
        while (numbers.length < numberOfNumbers) {
            let newNumber = Math.floor(Math.random() * (max - min)) + min;
            if (!numbers.includes(newNumber)) {
                numbers.push(newNumber);
            }
        }
        return numbers;
    }


    /**
     * Obfuscates a random amount of letters in the input string. 
     * @param {string} inputString 
     * @param {number} percentObfuscation 
     * @param {string} resetCode the reset code. For example "§d". The §r is automatically handled
     * @returns {string} a randomly obfuscated string
     */
    static randomlyObfuscate(inputString, percentObfuscation, resetCode) {
        if (resetCode == null) {
            resetCode = "";
        }
        let lengthOfInput = inputString.length;
        let replaceIndexes = this.generateRandomNumbers(0, lengthOfInput, Math.floor(lengthOfInput * percentObfuscation));
        for (let stringLocation = inputString.length-1; stringLocation >= 0; stringLocation--) {
            if (replaceIndexes.includes(stringLocation)) {
                inputString = inputString.substring(0, stringLocation) + "§k" + inputString[stringLocation] + "§r" + resetCode + inputString.substring(stringLocation+1);
            }
        }
        return inputString;
    }

    /**
     * 
     * @param {Player[]} playersToSort 
     * @param {Vector3} originLocation 
     * @param {number} radius
     * @param {string} dimension 
     */
    static getPlayersInRadius(playersToSort, originLocation, radius, dimension) {
        return playersToSort.filter((pl) => (dimension == null || dimension == "" || pl.dimension.id == dimension) && PlayerHandler.distanceBetweenLocations(pl.location, originLocation) <= radius);
    }
}