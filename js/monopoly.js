var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 10;
Monopoly.doubleCounter = 0;
//tracking elmininated players
Monopoly.elimCounter = 0;
Monopoly.totalPlayers = 0;

Monopoly.init = function(){
    $(document).ready(function(){
        //Monopoly.adjustBoardSize();
        //$(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
        });        
    };

Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

//roll the dice of Monopoly.allwoRoll is true
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};

//gets the player tile that is currently in turn 
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

//gets the cell the player referenced is on
Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};

//takes the integer value of the string value of the data-money attribute - which represents the players money
Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

//after any transaction where money changes, this function will be run to update a player's data-money attribute
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    //new money amout is set to scoreboard
    var scoreUpdate = $("#"+player.attr("id")+"score");
    scoreUpdate.html("$" + player.attr("data-money"));
    Monopoly.playSound("chaching");
};

//generates the value of the dice
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    var currentPlayer = Monopoly.getCurrentPlayer();
        if (result1 == result2){
            // 3 sets of doubles will get jail
        Monopoly.doubleCounter++;
            if(Monopoly.doubleCounter == 3) {
                Monopoly.handleGoToJail(currentPlayer);
            } else {
                Monopoly.handleAction(currentPlayer,"move",result1 + result2);
            }
        //adding in reroll doubles  with else statement
    } else {
        Monopoly.doubleCounter = 0;
        Monopoly.handleAction(currentPlayer,"move",result1 + result2);
    }

};

//allows rerolling with doubles - checks to see if doubles have been rolled
Monopoly.doubles = function() {
    if (Monopoly.doubleCounter > 0) {
        return true;
    } else {
        return false;
    }
};

//called when dice is rolled to move player
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
        //clear away smily face on new turn
    player.removeClass("same-property");
    var playerMovementInterval = setInterval(function(){
        //once movement is complete, deal with the player based on the cell he/she landed on
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
            //move the player if there are steps remaining
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};

//assigns actions to the player based on what cell he or she landed on
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
        //adding new else if statement in event player owns property to add smily face
    }else if(playerCell.is(".property:not(.available)") && playerCell.hasClass(player.attr("id"))) {
        player.addClass("same-property");
        //player is sent through the pay attribute of the handeaction function because thats where doubles are evaluated
        Monopoly.handleAction(player, "pay", 0);
    }else{
        Monopoly.handleAction(player, "pay", 0);
    }
}

//starts the next player's turn after the current player's turn finishes
Monopoly.setNextPlayerTurn = function(){
    //refresh doubles counter
    Monopoly.doubleCounter = 0;
    //check to see if there is victory
    Monopoly.victory();
    //test for bankruptcy of player who recently finished turn
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
        if (parseInt(currentPlayerTurn.attr("data-money")) < 0 && currentPlayerTurn.is(".removed") == false){
            //insert bankruptcy popup
            var popup = Monopoly.getPopup("broke");
            popup.find(".popup-title").text("Bankrupt!");
            popup.find(".popup-content #text-placeholder").text("Sorry, you are broke. Please return your tile and properties and exit the game.");
            popup.find("button").unbind("click").bind("click",function(){
            Monopoly.closePopup();
            //create new class for bankrupted player's tile to hid it from view
            var removedId = currentPlayerTurn.attr("id");
            $("#"+removedId).addClass("removed");
            $(".property."+removedId).removeClass(removedId).addClass("available").removeAttr("data-owner").removeAttr("data-rent");
            //change score to bankrupt
            $("#"+removedId+"score").html("bankrupt!");
            //start the next turn
            Monopoly.closeAndNextTurn();
            });
            Monopoly.showPopup("broke");
            return;
        }
        //sequence finds the next player and tests to see if they are not in jail or bankrupt in order to move
        var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
        var nextPlayerId = playerId + 1;
        if (nextPlayerId > $(".player").length){
        nextPlayerId = 1;
        }
        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
      nextPlayer.addClass("current-turn");
      //test to see if player is in jail
          if (nextPlayer.is(".jailed")){
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time",currentJailTime);
            if (currentJailTime > 2){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
        //test to see if bankrupt, is so, skip
    } else if (nextPlayer.is(".removed")) {
          Monopoly.setNextPlayerTurn();
          return;  
      }
    Monopoly.allowRoll = true;
};

//check property availability and give player option to buy
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
            Monopoly.closePopup();
        }
    });
    Monopoly.showPopup("buy");
};
//transfer money in the event property is owned
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closePopup();
            if (parseInt(player.attr("data-money")) < 0) {
                Monopoly.setNextPlayerTurn();
            } else {
                Monopoly.closeAndNextTurn();
            }
    });
   Monopoly.showPopup("pay");
};

//send player to jail if card or cell forces them to go
Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

//allows player to draw chance card and assigns the outcome
Monopoly.handleChanceCard = function(player){
    Monopoly.closePopup();
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};
//allows player to draw community card and assigns the outcome
Monopoly.handleCommunityCard = function(player){
    Monopoly.closePopup();
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("community");
};

//assigns the jail class to player once it has been established that they need to go there
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.closePopup();
    Monopoly.setNextPlayerTurn();

};

//brings up a popup, different ones are called in different circumstances
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};

//calculates the cost of a property based on its location on the board
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

//calculates the rent of a property based on its cost
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

//used to be used to close popus and end turn - now it is used to check for doubles and end turn
Monopoly.closeAndNextTurn = function(){
    //adding doubles functionality
    Monopoly.doubles();
    if (Monopoly.doubles() == false) {
    Monopoly.setNextPlayerTurn();
    } else {
        Monopoly.allowRoll = true;
        Monopoly.closePopup();
    }
    //Monopoly.closePopup();
};
//brings up the initial popup that gets the number of players and then runs a function to create them
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//transfer money and assign property a class corresponding to the buyer
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.playSound("woopwoop");
        Monopoly.showErrorMsg();
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        //more doubles implementation
        Monopoly.doubles();
        if ( Monopoly.doubles() == false) {
           Monopoly.setNextPlayerTurn(); 
        } else {
            Monopoly.allowRoll = true;
        }
        Monopoly.closePopup();
    }
};




//run different functionality depending on whether the player needs to pay, move, or go to jail
Monopoly.handleAction = function(player,action,amount){
    Monopoly.closePopup();
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.doubles();
                if (Monopoly.doubles() == false) {
                    Monopoly.setNextPlayerTurn();
                } else {
                    //ensure that doubles does not override bankruptcy
                    if (parseInt(player.attr("data-money")) < 0) {
                        Monopoly.setNextPlayerTurn();
                    } else {
                    Monopoly.allowRoll = true;
                }
                }
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    
};




//create players based on the number of players chose
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        //actual creation of dive tiles representing player tokens
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        Monopoly.totalPlayers++;
        //make sure player one gets first move
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
        //put initial money values in scoreboard
        var text = $(".score.p"+i);
        text.css("display", "inline-block");
        var scoreboard = $("#player"+i+"score");
        scoreboard.html("$"+Monopoly.moneyAtStart);
    }
};

//next cell fro player to move
Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//get money for passing go
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    //money input needs to be negative as payment functionality takes money away with a positive value 
    Monopoly.updatePlayersMoney(player, -Monopoly.moneyAtStart/10);
};

//check to see if there is no more than 4 or no fewer than 2 players
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 4){
                isValid = true;
            }
            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}

Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

//removed board size adjustment to make room for scoreboard
/*Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}*/
//close popup
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};
//play noises
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}
//show popup depending on the appropriate context
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};
//create victory condition
Monopoly.victory = function() {
    //count eliminated players each time from the beggining
    Monopoly.elimCounter = 0;
    for (var i = 1; i <= Monopoly.totalPlayers; i++) {
        var player = $("#player"+i);
        if (player.is(".removed")) {
            Monopoly.elimCounter++;
        }
    }
    //test to see if only 1 player is remaining, then find that player and congratulate him/her
    if ((Monopoly.totalPlayers - Monopoly.elimCounter) == 1) {
            var winner = $(".player").not(".removed");
            var popup = Monopoly.getPopup("win");
            popup.find(".popup-title").text("Winner!");
            popup.find(".popup-content #text-placeholder").text(winner.attr("id")+", you are triumphant with: $" + winner.attr("data-money") + ". Press ok to restart");
            popup.find("button").unbind("click").bind("click",function(){
            Monopoly.closePopup();
            for(var i = 1; i <= Monopoly.totalPlayers; i++) {
            $(".property.player"+i).removeClass("player"+i).addClass("available").removeAttr("data-owner").removeAttr("data-rent");
            $("#player"+i).remove();
    }
            //restart game after popup closes - page needs to be reloaded for everything to work appropriately
        location.reload(true);
    });
            Monopoly.showPopup("win");
}
};
Monopoly.init();