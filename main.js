(function(win) {
   win.tictac = {
      state: {
         gameCount: 0,
         gameTies: 0,
         turn: 0,
         symbols: ['X','O'],
         currentPlayer: 1,
         currentGame: "11",
         currentSymbol: function() { return ['X', 'O'][tictac.state.currentPlayer]; },
         opponentSymbol: function() { return ['O', 'X'][tictac.state.currentPlayer]; },
         games:{},
         game:{},
         players:[ {score:0,smallscore:0,tie:0,loss:0},{score:0,smallscore:0,draw:0,loss:0,tie:0} ],
         overlay: {originX:500, originY:800},
         lastGameCheck: 0,
         pickMode:"",
         pages: {},
         me: {}
      },
      sounds: {},
      data: {
         players: {},
         invites: {},
         requests: {}
      },
      getPlayerIdx: function(player) {
         return (player=="O") ? 1 : 0;
      },
      initSounds: function() {
         var sounds = ['bonk', 'floop', 'move', 'tictock', 'woop', 'move0', 'move1', 'winX', 'winO', 'notice0', 'notice1', 'winner', 'loser', 'tink', 'floop2', 'pop', 'blop', 'tick', 'slide'];
         for (var i in sounds) {
            tictac.sounds[sounds[i]] = new Audio("sounds/"+sounds[i]+".mp3");
         }
      },
      init: function() {
         if (window.Notification && Notification.permission!=='denied') {
            Notification.requestPermission(function(permission) {
               if (permission == "granted") {
                  tictac.state.notify = true;
               }
            });
         }
         tictac.state.gameCount++;
         tictac.state.won = 0;
         tictac.initSounds();
         $$("spinner").style.left = (window.innerWidth / 2) - 370 + "px";
         $$("spinner").classList.add("X");
         $$("spinner").style.display = "none";

         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               tictac.state.game[r+""+c] = "";
               tictac.state.games["game"+r+""+c] = {};
               for (var r1=0; r1<3; r1++) {
                  for (var c1=0; c1<3; c1++) {
                     tictac.state.games["game"+r+""+c]["game"+r+""+c+""+r1+""+c1] = "";
                  }
               }
            }
         }
         if (tictac.mobile) {
            // init spotlights
            var spotlightContainer = $$("spotlight");

            for (var r=0; r<3; r++) {
               for (var c=0; c<3; c++) {
                  var i = document.createElement("img");
                  i.src = "img/spotlights/" + r + "" + c + ".png";
                  i.id = "s"+r+""+c;
                  i.className = "s"+r+c;

                  spotlightContainer.appendChild(i);
               }
            }
         }
         var line;
         while (line = $$("winline")) {
            line.parentNode.removeChild(line);
         }
         tictac.state.currentPlayer ^= 1;
         $$("gameboard").innerHTML = "";
         tictac.newBoard();
         $$("gameboard").onclick = tictac.click;
         $$("gameboard").ontouchstart = tictac.click;
         if (!tictac.player) {
            tictac.player = [];
         }
         
         if (!tictac.player[0]) {
            tictac.player[0] = $$("player1").options[$$("player1").selectedIndex].value;
         }
         if (!tictac.player[1]) {
            tictac.player[1] = $$("player2").options[$$("player2").selectedIndex].value;
         }

         $$("player1").selectedIndex = (tictac.player[0]=="Computer") ? 1 : 0;
         $$("player2").selectedIndex = (tictac.player[1]=="Computer") ? 1 : 0;

         tictac.changePlayer(0, tictac.player[0]);
         tictac.changePlayer(1, tictac.player[1]);

         tictac.state.currentGame = "11";
         tictac.state.pickMode = ""; 
         tictac.clearDisabled();
         tictac.disableAll();
         tictac.clearActive();
         
         if (tictac.state.currentGame) {
            if (tictac.mobile) {
               $$("spotlight").style.height = "0";
               $$("spotlight").classList.add("s"+tictac.state.currentGame);
            }
            tictac.state.pickMode = ""; 
            setTimeout(function() {
               tictac.makeActive(tictac.state.currentGame);
            }, 500);
         }

         var winimage = $$("winnerImage");
         if (winimage) {
            winimage.parentNode.removeChild(winimage);
         }
         
         $$("gameCount").innerHTML = "Game: " + tictac.state.gameCount + "<br>Ties: " + tictac.state.gameTies;
         tictac.state.me.mymark = "X";
         if (tictac.mobile) {
            $$("spotlight").style.display = "none";
         }
         if ((tictac.player[0]=="Computer") && (tictac.player[1]=="Computer")) {
            tictac.automove();
         }
      },
      updatePlayer: function(player, who) {
         if (who=="Computer") {
            out =  '<img id="player'+(player+1)+'Pic" src="img/avatars/robot.png" height="50" width="50">';

         }
         if (who!="Computer") {
            out = '<img id="player'+(player+1)+'Pic" src="'+((tictac.state.players[player].photo) ? tictac.state.players[player].photo : "img/avatars/anonymous.png")+'" height="50" width="50">';
         }
         //out += '<br><span id="p'+player+'Score">'+tictac.state.players[player].score+' [w:'+tictac.state.players[player].smallscore+' t:'+tictac.state.players[player].tie+']</span>';
         $$("p"+(player+1)).innerHTML = out;
      },
      initSpotlights: function() {
            var spotlightContainer = $$("spotlight");

            for (var r=0; r<3; r++) {
               for (var c=0; c<3; c++) {
                  var i = document.createElement("img");
                  i.src = "img/spotlights/" + r + "" + c + ".png";
                  i.id = "s"+r+""+c;
                  i.className = "s"+r+c;

                  spotlightContainer.appendChild(i);
               }
            }
      },
      changePlayer: function(player, who) {
         if (who=="Facebook Login") {
            FB.login(function(response) {
               if (response.authResponse) {
                  tictac.state.authResponse = Object.assign({}, response.authResponse);
                  FB.api('/me?fields=name,first_name,last_name,email,picture.width(250).height(250)', function(response) {
                     // document.getElementById('status').innerHTML = 'Thanks for logging in, ' + response.name + '! <img src="'+response.picture.data.url+'">';
                     tictac.player[player] = response.name;
                     var plist = $$("player"+(player+1));
                     var op = document.createElement("option");
                     op.innerHTML = response.name;
                     plist.appendChild(op);
                     plist.selectedIndex = plist.options.length - 1;
                     $$("player"+(player+1)+"Pic").src = response.picture.data.url;
                     $$("player"+(player+1)+"Txt").innerHTML = response.name;

                     tictac.state.me = {};
                     tictac.state.me.photo = tictac.state.players[player].photo = response.picture.data.url;
                     tictac.state.me.player = tictac.state.players[player].player = response.name;
                     tictac.state.me.first_name = tictac.state.players[player].first_name = response.first_name;
                     tictac.state.me.last_name = tictac.state.players[player].last_name = response.last_name;
                     tictac.state.me.email = tictac.state.players[player].email = response.email;
                     tictac.state.me.fb_id = tictac.state.players[player].fb_id = response.id;
                     tictac.state.me.registered = tictac.state.players[player].registered = false;
                     tictac.doLogin(tictac.state.players[player], player);
                  },{scope:"email,user_friends"});
               } else {
                  console.log('User cancelled login or did not fully authorize.');
               }
            }); 
         } else {
            tictac.player[player] = who;
         }
         
         tictac.updatePlayer(player, who);
         return false;
      },
      move: function(spot, player, noReport=false) {
         var gameInfo = spot.match(/game(\d\d)(\d\d)?/);
         if (tictac.state.symbols[tictac.state.currentPlayer]!=player) {
            console.log("[move] Not player '"+player+"' turn (should be "+tictac.state.symbols[tictac.state.currentPlayer]+")");
            return false;
         }
         if (!noReport && (tictac.state.currentGame=="") && (!tictac.state.pickMode)) {
            tictac.makeActive(gameInfo[1]);
            tictac.state.pickMode = gameInfo[1];
            return false;
         } 
         if (!noReport && (tictac.state.currentGame=="") && tictac.state.pickMode) {
            if (tictac.state.pickMode != gameInfo[1]) {
               tictac.clearActive();
               tictac.makeActive(gameInfo[1]);
               return false;
            } else {
               tictac.state.currentGame = tictac.state.pickMode;
               tictac.state.pickMode = "";
            }
         }
         if (!spot || spot.length<8) {
            console.log("[move] Invalid or missing move space: "+spot);
            return false;
         }

         
         var tgt = $$(spot);
   
         if ((!gameInfo[1]) || (gameInfo[1] != tictac.state.currentGame) && (tictac.state.currentGame!="")) {
            console.log("[move] Attempt to make move on inactive game: " + gameInfo[1] + " (should be " + tictac.state.currentGame +")");
            return false;
         }
         if (tictac.state.games["game"+gameInfo[1]][spot]!="") {
            console.log("[move] Attempt to make move on already occupied space: " + tictac.state.games["game"+gameInfo[1]][spot] + " (game: game"+gameInfo[1]+", spot: "+spot+")");
            return false;
         }
         if (tictac.state.currentGame=="") {
            tictac.state.currentGame = gameInfo[1];
         }
         

         // Take care of DOM stuff first
         var mark = document.createElement("img");
         //mark.src = (tictac.mobile) ? "img/"+player+".png" : "img/ani"+player+".gif";
         mark.src = "img/ani"+player+".gif";
         
         mark.className = "mark";
         tgt.appendChild(mark);
         
         // tgt.innerHTML = player;
         setTimeout(function() { 
            mark.classList.add("marked"); 
            tictac.playSound("move"+tictac.state.currentPlayer);
            tgt.classList.remove("active");
         }, 5);
         tgt.classList.add(player);
         
         setTimeout(function() {
            mark.src = "img/"+player+".png";
         }, 2000);

         
         // Log player move 
         tictac.state.games["game"+tictac.state.currentGame][spot] = player;
         tictac.state.lastGame = tictac.state.currentGame;
         tictac.state.lastMove = spot;
         tictac.state.currentGame = gameInfo[2];
         
         if ((tictac.player[0]!='Computer' && tictac.player[1]!='Computer') && (!noReport)) {
            tictac.exec("move", {move: spot, player: tictac.state.currentPlayer, player_id: tictac.state.me.id, for_player_id: tictac.state.players[tictac.state.currentPlayer^1].id, game_id: tictac.state.game_id, game:tictac.encodeGames(), player1_score:JSON.stringify(tictac.state.players[0]), player2_score:JSON.stringify(tictac.state.players[1])}, function(obj) {
         
         });
         }

         setTimeout(function() { tictac.nextPlayer(); }, 1000);
      },
      playSound: function(sound) {
         var snd = new Audio("sounds/"+sound+".mp3");
         snd.play();
      },
      pickGame: function() {
         var picks = [];
         for (var i in tictac.state.game) {
            if (tictac.state.game[i]=="") {
               picks.push(i);
            }
         }
         var pick = Math.round(Math.random()*(picks.length-1));
         console.log("Picking game automatically: " + picks[pick]);
         return picks[pick];
      },
      doPick: function(g, me) {
         var picks = [];
         var pick = "";

         var game = tictac.state.games[g];

         for (var r=0; r<3; r++) {
            if (game[g+r+"0"] == me) {
               if ((game[g+r+"1"]==me) && (game[g+r+"2"]=="")) {
                  return g+r+"2";
               }
               if ((game[g+r+"1"]=="") && (game[g+r+"2"]==me)) {
                  return g+r+"1";
               }
             }
             if (game[g+r+"1"] == me) {
               if ((game[g+r+"0"]=="") && (game[g+r+"2"]==me)) {
                  return g+r+"0";
               }
               if ((game[g+r+"0"]==me) && (game[g+r+"2"]=="")) {
                  return g+r+"2";
               }
             }
         }
         // Check for win moves by column
         for (var c=0; c<3; c++) {
            if (game[g+"0"+c] == me) {
               if ((game[g+"1"+c]==me) && (game[g+"2"+c]=="")) {
                  return g+"2"+c;
               }
               if ((game[g+"1"+c]=="") && (game[g+"2"+c]==me)) {
                  return g+"1"+c;
               }
           }
           if (game[g+"1"+c] == me) {
               if ((game[g+"0"+c]=="") && (game[g+"2"+c]==me)) {
                  return g+"0"+c;
               }
               if ((game[g+"0"+c]==me) && (game[g+"2"+c]=="")) {
                  return g+"2"+c;
               }
            }
         }
         // Check for win move diagonally from top-left to bottom-right
         if ((game[g+"00"]==me) && (game[g+"11"]==me) && (game[g+"22"]=="")) {
            return g+"22";
         }
         if ((game[g+"00"]==me) && (game[g+"11"]=="") && (game[g+"22"]==me)) {
            return g+"11";
         }
         if ((game[g+"00"]=="") && (game[g+"11"]==me) && (game[g+"22"]==me)) {
            return g+"00";
         }

         // Check for win move diagonally from top-right to bottom-left
         if ((game[g+"02"]==me) && (game[g+"11"]==me) && (game[g+"20"]=="")) {
            return g+"20";
         }
         if ((game[g+"02"]==me) && (game[g+"11"]=="") && (game[g+"20"]==me)) {
            return g+"11";
         }
         if ((game[g+"02"]=="") && (game[g+"11"]==me) && (game[g+"20"]==me)) {
            return g+"02";
         }

         return pick; 
      },
      doPick2: function(g, me) {
         var game = tictac.state.games[g];
         // Check for fork moves
         if ((game[g+"01"]==me) && ((game[g+"10"]==me) || (game[g+"20"]==me))  && (game[g+"00"]=="")) {
            return g+"00";
         }
         if ((game[g+"21"]==me) && ((game[g+"10"]==me) || (game[g+"00"]==me))  && (game[g+"20"]=="")) {
            return g+"20";
         }

         if ((game[g+"00"]==me) && (game[g+"21"]==me)  && (game[g+"01"]=="")) {
            return g+"01";
         }
         if ((game[g+"00"]==me) && (game[g+"12"]==me)  && (game[g+"11"]=="")) {
            return g+"11";
         }
         if ((game[g+"00"]==me) && (game[g+"12"]==me)  && (game[g+"02"]=="")) {
            return g+"02";
         }
         
         if ((game[g+"21"]==me) && ((game[g+"10"]==me) || (game[g+"00"]==me))  && (game[g+"20"]=="")) {
            return g+"20";
         }

         if ((game[g+"10"]==me) && ((game[g+"01"]==me) || (game[g+"02"]==me))  && (game[g+"00"]=="")) {
            return g+"00";
         }
         if ((game[g+"12"]==me) && ((game[g+"01"]==me) || (game[g+"00"]==me))  && (game[g+"02"]=="")) {
            return g+"02";
         }
         return ""; 
      },
      automove: function() {
         var picks = [];
         
         // Update games status
         tictac.checkGames();
         
         // Check for game win, exit if game has been won
         var win = tictac.checkWin();
         if (win) {
            return false;
         }

         // If no game is active it is an open playing field and a game must be chosen
         if (tictac.state.currentGame == "") {
            tictac.state.currentGame = tictac.pickGame();
         }
         
         // First check for any winning moves
         var pick = tictac.doPick("game"+tictac.state.currentGame, tictac.state.currentSymbol());
         if (pick) console.log("[AI] WIN Move: "+pick);
         
         // If no winning moves, see if we can block any opponent winning moves
         if (!pick) {
            pick = tictac.doPick("game"+tictac.state.currentGame, tictac.state.symbols[tictac.state.currentPlayer^1]);
            if (pick) console.log("[AI] BLOCK Move: "+pick);
         }
         if (!pick) {
            console.log("[AI] No obvious move; attempting smart move:");
            pick = tictac.doPick2("game"+tictac.state.currentGame, tictac.state.currentSymbol());
            if (pick) console.log("[AI] SMART Move: "+pick);
         }
         if (!pick) {
            var id = "game"+tictac.state.currentGame;
            var g = tictac.state.games[id];
            for (var r=0;r<3;r++) {
               if (g["game0"+r] == tictac.state.currentSymbol()) {
                  if (tictac.game["1"+r] == "") {
                  
                  }
               }
            }
            for (var i in tictac.state.games["game"+tictac.state.currentGame]) {
               if (tictac.state.games["game"+tictac.state.currentGame][i]=="") {
                  picks.push(i);
               }
            }
            if (picks.length==0) {
               console.log("No open spaces in this game. Picking another game.");
               tictac.state.currentGame="";
               tictac.pickGame();
            } else {
               pick = picks[Math.round(Math.random()*(picks.length-1))];
               console.log("Pick: "+pick);
            }
         }

         if (pick) {
            tictac.move(pick, tictac.state.currentSymbol());
         } else {
            console.log("Something weird happening. Resetting...");
            tictac.checkGames();
         //   tictac.automove();
         }
      },
      switchPlayer: function() {
         //$$("wrapper").classList.remove(tictac.state.currentSymbol()+"cursor");
         tictac.state.currentPlayer ^= 1;
         // $$("wrapper").classList.add(tictac.state.currentSymbol()+"cursor");
         
         $$('currentPlayer').innerHTML = tictac.state.currentSymbol();
      },
      nextPlayer: function() {
         if (tictac.mobile) $$("spotlight").style.height = "0";
         tictac.state.turn++;
         
         tictac.switchPlayer();
         tictac.checkGames();
         
         tictac.clearDisabled();
         tictac.disableAll();
         tictac.clearActive();

         if (tictac.state.game[tictac.state.currentGame]=="") {
            $$('container' + tictac.state.currentGame).classList.remove("disabled");
         } else {
            tictac.state.currentGame="";
            tictac.clearDisabled();
            tictac.growAll();
         }

         var win = tictac.checkWin();
         if (tictac.state.currentGame && !win) {
            if (tictac.state.lastGame == tictac.state.currentGame) {
               if (tictac.mobile) $$("spotlight").style.height = "0";
               setTimeout(function() { tictac.makeActive(tictac.state.currentGame); }, 500);
            } else {
               tictac.makeActive(tictac.state.currentGame);
            }
            // if (tictac.mobile) tictac.fillBig();
         }
         if (tictac.state.players[tictac.state.currentPlayer].id == tictac.state.me.id) {
            $$("spinner").style.display = "none";
         } else {
            $$("spinner").classList.add(tictac.state.me.mymark);
            $$("spinner").style.display = "inline-block";
         }
         if ((tictac.player[tictac.state.currentPlayer]=="Computer") && (!win)) {
            setTimeout(function() { tictac.automove(); }, 1250);
         }

         if (tictac.state.players[tictac.state.currentPlayer].id != tictac.state.me.id) {
            setTimeout(function() { tictac.checkForMoves(); }, 1000);
         }
      },
      fillBig: function() {
         var cg = tictac.state.games["game"+tictac.state.currentGame];

         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               var cell = $$("big"+r+""+c);
               cell.innerHTML = "";
               var out = "";
               if (cg && cg["game"+tictac.state.currentGame+""+r+""+c]) {
                  out = document.createElement("img");
                  out.src = "img/"+cg["game"+tictac.state.currentGame+""+r+""+c]+".png";
                  out.classList.add('bigMark');
                  cell.appendChild(out);
               }
            }
         }
         setTimeout(function() { 
            var marks = document.querySelectorAll(".bigMark");
            for (mark of marks) {
               mark.classList.add("marked");
            }
         }, 50);
      },
      click: function(evt) {
         var tgt = evt.target;
         if (tgt.id.match(/^game/)) {
            tgt.classList.add("active");
            setTimeout(function() { tgt.classList.remove("active"); }, 300);
            tictac.move(tgt.id, tictac.state.currentSymbol());
         }
         
      },
      clearActive: function() {
         var els = document.getElementsByClassName("activeGame");
         Array.prototype.forEach.call(els, function(el) {
            el.classList.remove("activeGame");
         });
      },
      clearDisabled: function() {
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               $$("container"+r+""+c).classList.remove("disabled");
            }
         }
      },
      disableAll: function() {
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               $$("container"+r+""+c).classList.add("disabled");
            }
         }
      },
      generateBoard: function() {
         var container = document.getElementById("gameboard"),
             scoreboard = 0;
         for (var r=0; r<3; r++) {
            var row = document.createElement("tr");
            row.id = "r"+r;
            
            for (var c=0; c<3; c++) {
               var cell = document.createElement("td");
               cell.id = "container" + r + "" + c;
               cell.className = "game_row" + r + " game_col" + c + " disabled";
               cell.onclick = tictac.click;
               
               var g = tictac.makeGame("game" + r + "" + c, tictac.state.games["game" + r + "" + c]);
               
               cell.appendChild(g);
               row.appendChild(cell);
            }
            container.appendChild(row);
         }
         var cg = $$("container" + tictac.state.currentGame);
         cg.classList.remove("disabled");
      },
      makeGame: function(id, game) {
         var container = document.createElement("table");
         container.id = id;

         for (var r=0; r<3; r++) {
            var row = document.createElement("tr");
            row.id = id + r;
            
            for (var c=0; c<3; c++) {
               var cell = document.createElement("td");
               cell.id = id + r + "" + c;
               cell.className = "cell row" + r + " col" + c;
               
               if (game && game[id+r+c]) {
                  cell.innerHTML = game[id+r+c];
                  cell.className += " filled " + game[id+r+c];
               }
               row.appendChild(cell);
            }
            container.appendChild(row);
         }
         return container;   
      },
      updateGame: function() {
         var snapshot = [];
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               tictac.state.game[r+""+c] = tictac.checkGame(r + "" + c);
            }
         }
      },
      checkGames: function(dowin=true) {
         var snapshot = [];
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               var results = tictac.checkGame(r + "" + c);
               if (tictac.state.game[r+""+c] != results.winner) {
                  tictac.state.game[r+""+c] = results.winner;
                  if (results.winner == "-") {
                     tictac.doDraw(r + "" + c);
                  } else if (results.winner!="") {
                     tictac.doWin(results.spots, results.winner);
                  }
               }
            }
         }
         
         if (tictac.state.game[tictac.state.currentGame]!=="") {
            tictac.state.currentGame = "";
            tictac.disableAll();
         }
      },
      checkGame: function(game, dowin=true) {
         var win = false, winner="", winners=[];

         var rgame = tictac.state.games["game"+game];
         var id = "game"+game;

//         if (tictac.state.game[game]=="") {
            // Check for diagnal wins
            if ((rgame[id+"00"]!="") && 
                  ((rgame[id+"00"] == rgame[id+"11"]) && 
                     (rgame[id+"00"] == rgame[id+"22"]))) {
               winner = rgame[id+"00"];
               winners = [id+"00", id+"11", id+"22"];
               win = true;
            }
            if ((rgame[id+"02"]!="") && 
                  ((rgame[id+"02"] == rgame[id+"11"]) && 
                     (rgame[id+"02"] == rgame[id+"20"]))) {
               win = true;
               winner = rgame[id+"02"];
               winners = [id+"02", id+"11", id+"20"];
            }
            
            // Check for wins by row and by column
            for (var r=0; r<3; r++) {
               id = "game"+game+""+r;
               if ((rgame[id+"0"]!="") && 
                  ((rgame[id+"0"] == rgame[id+"1"]) && 
                   (rgame[id+"0"] == rgame[id+"2"]))) {
                  win = true;
                  winner = rgame[id+"0"];
                  winners = [id+"0", id+"1", id+"2"];
               }
               
               id = "game"+game;
               if ((rgame[id+"0"+r]!="") && 
                  ((rgame[id+"0"+r] == rgame[id+"1"+r]) && 
                   (rgame[id+"0"+r] == rgame[id+"2"+r]))) {
                  win = true;
                  winner = rgame[id+"0"+r];
                  winners = [id+"0"+r, id+"1"+r, id+"2"+r];
               }
            }
            
            if (dowin && win) {
               // tictac.doWin(winners, winner);
            }

            var space = 0;
            for (var i in rgame) {
               if (rgame[i]=="") {
                  space++;
               }
            }
            if ((space==0) && (!winner)) {
               console.log("Sub-game DRAW: " + game);
               // tictac.doDraw(game);
               winner = "-";
               win = true;
               $$("container"+game).classList.add("DRAW");
               $$("container"+game).classList.add("disabled");
            }
         // }
         return { winner: winner, spots: winners, win: win };
      },
      checkWin: function() {
         var win = false, winner="";

         var rgame = tictac.state.game;
         var id = "";

         // Check for diagnal wins
         if ((rgame["00"]!="") && ((rgame["00"] == rgame["11"]) && (rgame["00"] == rgame["22"]))) {
            winner = rgame["00"];
            tictac.gameWin(["00", "11", "22"], winner);
            win = true;
         }
         if ((rgame["02"]!="") && ((rgame["02"] == rgame["11"]) && (rgame["02"] == rgame["20"]))) {
            win = true;
            winner = rgame["02"];
            tictac.gameWin(["02", "11", "20"], winner);
         }
         
         // Check for wins by row and by column
         for (var r=0; r<3; r++) {
            id = r;
            if ((rgame[id+"0"]!="") && (rgame["0"+id]!="-") && 
               ((rgame[id+"0"] == rgame[id+"1"]) && 
                (rgame[id+"0"] == rgame[id+"2"]))) {
               win = true;
               winner = rgame[id+"0"];
               tictac.gameWin([id+"0", id+"1", id+"2"], winner);
               console.log("Won across for " + rgame[id+"0"]);
               console.dir(rgame);
            }
            
            if ((rgame["0"+id]!="") && (rgame["0"+id]!="-") &&
               ((rgame["0"+id] == rgame["1"+id]) && 
                (rgame["0"+id] == rgame["2"+id]))) {
               win = true;
               winner = rgame["0"+id];
               tictac.gameWin(["0"+id, "1"+id, "2"+id], winner);
               console.log("Won down for " + rgame["0"+id]+" [id: 0"+id+"]");
               console.dir(rgame);
            }
         }

         var space = 0;
         for (var i in rgame) {
            if (rgame[i]=="") {
               space++;
            }
         }
         if ((space==0) && (!winner)) {
            winner = "-";
            console.log("DRAW GAME");
            tictac.gameDraw();
         }

         return winner;
      },
      flashWinners: function(winners, count) {
         for (var i in winners) {
            var img = $$("img"+winners[i]);
            if (img) {
               if (count%2) {
                  img.style.opacity = 1;
               } else {
                  img.style.opacity = 0;
               }
            }
         }
         ++count;
         if (count < 10) {
            setTimeout(function() { tictac.flashWinners(winners, count); }, 300);
         }
      },
      updateScores: function() {
         return false;
         for (var p=0; p<2; p++) {
            $$("p"+p+"Score").innerHTML =  tictac.state.players[p].score+' [w:'+tictac.state.players[p].smallscore+' t:'+tictac.state.players[p].tie+']</span>';
         }
      },
      gameWin: function(spots, winner) {
         var pidx = tictac.getPlayerIdx(winner);
         $$("spinner").style.display = "none";
         if (tictac.state.won) {
            return false; 	// Already registered win
         }
         tictac.state.won = tictac.state.players[pidx].id;
              
         tictac.state.players[pidx].score++;
         tictac.updateScores();

         tictac.clearActive();
         tictac.disableAll();
         tictac.flashWinners(spots, 0);

         for (var i in spots) {
            $$("container"+spots[i]).classList.remove("disabled");
            $$("container"+spots[i]).classList.add("win");

         }
         console.log("Game winning spots:");
         console.dir(spots);
         setTimeout(function() { tictac.winLine(spots, winner); }, 250);
         
         var img = $$("winnerImage");
         if (!img) {
            img = document.createElement("img");
            img.src = "img/" + winner + ".png";
            img.style.position = "absolute";
            img.style.width = "0px";
            img.style.height = "0px";
            img.style.left = ((window.innerWidth / 2) - 150) + "px";
            img.style.top = "1em";
            img.id = "winnerImage";
            img.style.opacity = 1;

            $$("wrapper").appendChild(img);
         }

         if (tictac.state.players[pidx].id == tictac.state.me.id) {
            var win = new Audio("sounds/winner.mp3");
            win.play();
            //tictac.sounds['winner'].play();
         } else { 
            var win = new Audio("sounds/loser.mp3");
            win.play();
            //tictac.sounds['loser'].play();
         }
         setTimeout(function() {
               var img = $$("winnerImage");
               img.style.height = "600px";
               img.style.left = "50px"; // (window.innerWidth / 2) - 350 + "px";
               img.style.width = "600px";
               img.style.top = "30px";
         }, 1000);
         setTimeout(function() {
            var img = $$("winnerImage");
            img.style.transform = "scale(5)";
            img.style.opacity = 0;
         }, 5000);

         setTimeout(function() {
            var img = $$("winnerImage");
            if (img) img.parentNode.removeChild(img);
         }, 7000);
         
         setTimeout(function() {
            tictac.clearActive();
            tictac.disableAll();
         }, 2000);
         
         tictac.exec("win", {game_id: tictac.state.game_id, winner: tictac.state.players[pidx].id, game: tictac.encodeGames() });

         if ((tictac.player[0]=="Computer") && (tictac.player[1]=="Computer")) {
            setTimeout(function() { tictac.init(); }, 5000);
         }
         // setTimeout(function() { alert(winner + " Wins!"); }, 1000);
      },
      gameDraw: function() {
         tictac.state.gameTies++;
         var img = document.createElement("img");
         img.src = "img/draw.png";
         img.style.position = "absolute";
         img.style.width = "0px";
         img.style.height = "0px";
         img.style.left = (window.innerWidth / 2) + "px";
         img.style.top = "20%";
         img.style.opacity = 1;
         img.id = "winnerImage";

         $$("wrapper").appendChild(img);
         setTimeout(function() {
            var img = $$("winnerImage");
            img.style.height = "600px";
            img.style.left = (window.innerWidth / 2) - 350 + "px";
            img.style.top = "0px";
            img.style.width = "600px";
            img.style.top = "30px";
         }, 1);
         setTimeout(function() {
            var img = $$("winnerImage");
            img.style.opacity = 0;
         }, 3000);
         
         tictac.exec("draw", {game_id: tictac.state.game_id, winner: "-", game: tictac.encodeGames() });
         
         if ((tictac.player[0]=="Computer") && (tictac.player[1]=="Computer")) {
            setTimeout(function() { tictac.init(); }, 5000);
         }
      },
      doWin: function(cells,winner,sound=true) {
         var pidx = tictac.getPlayerIdx(winner);
         var lidx = pidx^1;
         var loser = (winner=="X") ? "O" : "X";

         tictac.state.players[pidx].smallscore++;
         tictac.state.players[lidx].loss++;

         tictac.updateScores();
         
         for (var cell in cells) {
            $$(cells[cell]).classList.add(winner+"WINcell");
            $$(cells[cell]).classList.remove(loser+"WINcell");
         }
         var g = cells[0].match(/game(\d\d)(\d\d)/)[1];
         $$("container"+g).classList.add(winner+"WIN");
         $$("container"+g).classList.remove(loser+"WIN");
         
         var winImage = $$("img"+g);
         if (!winImage) {
            var winImage = document.createElement("img");
            winImage.id = "img"+g;
            winImage.className = "winimage";
            winImage.style.transform = "scale(0)";
            $$("container"+g).appendChild(winImage);

         }
         winImage.style.transform = "scale(0)";
         winImage.src = "img/" + winner + ".png";
         setTimeout(function() {
            winImage.style.transform = "scale(1)";
            console.log("win"+winner);
            if (sound) {
               var snd = new Audio("sounds/win"+winner+".mp3");
               snd.play();
               //tictac.sounds['win'+winner].play();
            }
         }, 100);
       },
      doDraw: function(game) {
         tictac.state.players[0].tie++;
         tictac.state.players[1].tie++;
         if (!$$("img"+game)) {
            var winImage = document.createElement("img");
            winImage.src = "img/draw.png";
            winImage.id = "img"+game;
            winImage.className = "winimage";
            $$("container"+game).appendChild(winImage);
         }
      },
      winLine: function(cells, winner) {
         var line = document.createElement("div"), w, h;
         line.id = "winline";
         line.className = "winline "+winner+"game";

         var s1 = cells[0].match(/(\d)(\d)/);
         var s2 = cells[1].match(/(\d)(\d)/);
         var s3 = cells[2].match(/(\d)(\d)/);
         
         if (parseInt(s1[1]) == parseInt(s2[1])) {
            w = "26em";
            h = "1.2em";
            line.style.top = 3 + (9 * (s1[1])) + "em";
            line.style.left = "5em";
         }
         if (parseInt(s1[2]) == parseInt(s2[2])) {
            w = "1.2em";
            h = "26em";
            line.style.top = ".25em";
            line.style.marginLeft = 3 + (9 * (s1[2])) + "em";
         }
         if (s1[1]==0 && s1[2] == 0 && s2[1]==1 && s2[2]==1 && s3[1]==2 && s3[2]==2) {
            w = "36em";
            h = "1.2em";
            line.style.transformOrigin = "0% 0%";
            line.style.top = ".25em";
            line.style.marginLeft = "2em";
            line.style.transform="rotate(45deg)";
         }
         if (s1[1]==0 && s1[2] == 2 && s2[1]==1 && s2[2]==1 && s3[1]==2 && s3[2]==0) {
            w = "36em";
            h = "1.2em";
            line.style.transformOrigin = "0% 0%";
            line.style.top = "25em";
            line.style.left = "-1em";
            line.style.transform="rotate(-45deg)";
         }
         
         $$("wrapper").appendChild(line);
         setTimeout(function() {
            line.style.width = w;
            line.style.height = h;
         }, 100);
      },
      exec: function(action, data, callback) {
         var xmlhttp = new XMLHttpRequest();
         xmlhttp.open("POST", "cmd.php");
         xmlhttp.setRequestHeader("Content-Type", "application/json");
         xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
               if (callback && typeof(callback) == "function") {
                  var obj = {};
                  if (xmlhttp.responseText) {
                     try {
                        obj = JSON.parse(xmlhttp.responseText);
                     } catch(e) { }
                  }
                  callback(obj);
                // console.log("[RESPONSE] " + xmlhttp.responseText);
                }
             }
         };
         xmlhttp.send(JSON.stringify({"action":action, "data":data}));

      },
      makeBadge: function(action, cnt, bounce) {
         var badge = $$(action + "Badge");
         if (cnt > 0) {
            if (!badge) {
               badge = document.createElement("div");
               badge.classList.add("badge");
               badge.id = action + "Badge";
               badge.innerHTML = cnt;
               badge.style.transform = "scale(0) translateY(0px)";
               badge.style.transitionDuration = "1000ms";
               $$(action).parentNode.appendChild(badge);
               setTimeout(function() { $$(action+"Badge").style.transform = "scale(1) translateY(0px)"; tictac.sounds['woop'].volume=0.25; var snd = new Audio("sounds/woop.mp3"); snd.play(); }, 50);
               setTimeout(function() { $$(action+"Badge").style.transitionDuration = "350ms"; }, 1050);

               setTimeout(function() {
                  tictac.bounce(badge, 0, 5);
               }, 5000);
            } else if (badge.innerHTML != cnt) {
               badge.innerHTML = cnt;
               badge.style.transitionDuration = "750ms";
               badge.style.transform = "scale(1.5) translateY(0px)";
               var snd = new Audio("sounds/blop.mp3");
               snd.volume = .5; 
               snd.play(); 
               setTimeout(function() { $$(action+"Badge").style.transform = "scale(1) translateY(0px)"; $$(action+"Badge").style.transitionDuration = "350ms"; }, 1000);
               tictac.bounce(badge, 0);
            }
         } else {
            if (badge) {
               badge.style.transform = "scale(0)";
               setTimeout(function() { $$(action+"Badge").parentNode.removeChild($$(action+"Badge")); }, 1000);
            }
         }
      },
      bounce: function(who, cnt, maxBounce=3) {
         //who.style.transform = "translateY(-" + (30 - ((30/maxBounce)*cnt)) + "px)";
         //setTimeout(function() { who.style.transform = "translateY(0px)"; }, 250);
         who.classList.add("bounce");
         setTimeout(function() { who.classList.remove("bounce"); }, 2000);
         ++cnt;
         if (cnt<maxBounce) {
            setTimeout(function() { tictac.bounce(who, cnt, maxBounce); }, 15000);
         }
      },
      checkInvites: function() {
         tictac.exec("invites", {id: tictac.state.me.id}, function(obj) {
            if (obj.invites.length || obj.requests.length) {
               tictac.fillRequests(obj.invites, obj.requests);
               console.dir(obj);
               tictac.makeBadge('requests', obj.invites.length);
               if (tictac.state.notify) {
                //  tictac.doNotify("You got a game invitation!", "img/logos/logo-256.png", "Tic-Tac-Whoa! Invitation");
               }

               for (var invite of obj.invites) {
                  tictac.ackInvite(invite.id);
               }
            }
         });
      },
      ackInvite: function(id) {
         if (id) {
            tictac.exec("ackInvite", {id: id}, function(response) {
            });
         }
      },
      fillRequests: function(invites, reqs) {
         var out = '<div class="requestWrapper">';
         out += "<h2>Incoming</h2>";
         if (invites.length) {
            for (var i in invites) {
               var invite = invites[i];
               tictac.data.invites[invites[i].id] = invite;
               out += '<table class="request"><tr><td style="width:75px"><img src="'+invite['photo']+'" class="profilePic"></td><td><div class="requestHeader">Request from ' + invite['player'] + '</div>';
               out += 'Requested: ' + tictac.dateDuration(invite.created, "now") + '</td><td style="text-align:right;white-space:nowrap"><button class="highlight btn accept" onclick="tictac.accept(' + invite['id'] + ', ' + invite['player1_id'] + ')">Accept</button>';
               out += '<button class="highlight btn ignore" onclick="tictac.ignore(' + invite['id'] + ')">Ignore</button>';
               out += '<button class="highlight btn decline" onclick="tictac.decline(' + invite['id'] + ')">Decline</button>';
               out += '</td></tr></table>';
            }
         } else {
            out += "<h3>No incoming game requests</h3>";
         }
         out += "</div><div class='requestWrapper'><h2>Outgoing</h2>";
         for (var i in reqs) {
            var req = reqs[i];
            tictac.data.requests[reqs[i].id] = req;
            out += '<table class="request"><tr><td style="width:75px"><img src="'+req['photo']+'" class="profilePic"></td><td><div class="requestHeader">Request to ' + req['player'] + '</div>';
            out += 'Requested: ' + tictac.dateDuration(req.created, "now") + '</td><td style="text-align:right;white-space:nowrap"><button style="width:10em" class="highlight btn cancel" onclick="tictac.cancelInvite(' + req['id'] + ')">Cancel Invitation</button>';
            out += '</td></tr></table>';
         }
         out += "</div>";
         $$("requestsWrapper").innerHTML = out;

      },
      checkRequested: function(id) {
         for (var i in tictac.data.requests) {
	    var req = tictac.data.requests[i];
	    if (inv.player1_id==id) {
	       return true;
	    }
	 }
	 return false;
      },
      checkInvited: function(id) {
         for (var i in tictac.data.invites) {
	    var inv = tictac.data.invites[i];
	    if (inv.player2_id==id) {
	       return true;
	    }
	 }
	 return false;
      },
      fillPlayers: function(players) {
         var out = "";
         for (var i in players) {
            var player = players[i];
            out += '<div class="inviteWrapper"><table class="players"><tr><td class="profileCell"><img src="'+player['photo']+'" class="profilePic"><div class="playersHeader">' + player['player'] + '</div></td>';
            out += '<td><table class="clean"><tr><td class="field">Played:</td><td class="val">' + player.plays + '</td></tr>';
            out += '<tr><td class="field">Wins:</td><td class="val">' + player.wins + '</td></tr><tr><td class="field">Losses:</td><td class="val">' + player.losses + '</td></tr><tr><td class="field">Ties:</td><td class="val">' + player.ties + '</td></tr></table></td></tr><tr>';
            out += '<td colspan="2" style="text-align:center"><button id="btnInvite_'+player.id+'" ';
	    if (!tictac.checkInvited(player.id)) {
	       out += 'onclick="tictac.invite(' + player.id + ')">Invite';
	    } else {
	       out += 'class="invited">Invited';
	    }
	    
            out += '</button></td></tr></table></div>';
         }
         $$("invitesWrapper").innerHTML = out;

      },
      fillGames: function(games) {
         var out = "",
         myturn = "", theirturn="";
         var imup = 0;

         for (var i in games) {
            var game = games[i], opponent;
            
            var tmp = '<div class="gameWrapper"><table class="game"><tr>';
            // If I'm player 1 and player_up is 0 then it is my turn
            if (game.player1_id == tictac.state.me.id) {
               opponent = tictac.data.players[game.player2_id];

               tmp += '<td class="playerCell"><img src="'+tictac.state.players[0]['photo']+'" class="profilePic"><br>' + tictac.state.players[0]['player'] + '</td>';
               tmp += '<td><h2>vs.</h2></td>';
               tmp += '<td class="playerCell"><img src="'+opponent['photo']+'" class="profilePic"><br>' + opponent['player'] + '</td>';
               // tmp += '<td style="text-align:right"><b>Started:</b></td><td>' + tictac.formatDate(game.created) + '</td>';
               tmp += '<td style="line-height:1;text-align:center;font-size:.9em;">';
               tmp += (game.player_up==0) ? '<button onclick="tictac.play(' + game['id'] + ')">Play</button>' : '<span class="waiting">Waiting</span>';
               tmp += '<br><br><b>Moved:</b> <span class="caps">' + tictac.dateDuration(game.last_moved, "now") + '</span></td></tr></table></div>'
               
               if (game.player_up==0) {
                  myturn += tmp;
                  imup++;
               } else {
                  theirturn += tmp;
               }
            } else {
               opponent = tictac.data.players[game.player1_id];
               tmp += '<td class="playerCell"><img src="'+opponent['photo']+'" class="profilePic"><br>' + opponent['player'] + '</td>';
               tmp += '<td><h2>vs.</h2></td>';
               tmp += '<td class="playerCell"><img src="'+tictac.state.players[0]['photo']+'" class="profilePic"><br>' + tictac.state.players[0]['player'] + '</td>';
               //tmp += '<td style="text-align:right"><b>Started:</b></td><td colspan="2">' + tictac.formatDate(game.created) + '</td></tr>';
               tmp += '<td style="line-height:1;text-align:center;font-size:.9em;">';
               tmp += (game.player_up==1) ? '<button onclick="tictac.play(' + game['id'] + ')">Play</button>' : '<span class="waiting">Waiting</span>';
               tmp += '<br><br><b>Moved:</b> <span class="caps">' + tictac.dateDuration(game.last_moved, "now") + '</span></td></tr></table></div>'
           
               if (game.player_up==1) {
                  myturn += tmp;
                  imup++;
               } else {
                  theirturn += tmp;
               }
            }
         }
         out = "<h2 style='font-size:2.5em;color:#0d0;'>My Turn</h2>\n" + myturn + "\n<h2 style='font-size:2.5em;color:#e00;'>Their Turn</h2>\n" + theirturn;
         tictac.makeBadge('games', imup);
         $$("gamesWrapper").innerHTML = out;
      },
      dateDuration: function(start="now", end="now") {
         if (start=="now") {
            start = Date().toString();
         }
         if (end=="now") {
            end = Date().toString();
         }
         
         var t1 = Date.parse(start) / 1000;
         var t2 = Date.parse(end) / 1000;
         
         if (start.match(/(\d\d\d\d)\-(\d\d)\-(\d\d)\s(\d+):(\d+):(\d+)/)) {
            start = start.replace(/\s/, 'T');
            t1 = (Date.parse(start) / 1000) + 28800;
         }

         if (end.match(/(\d\d\d\d)\-(\d\d)\-(\d\d)\s(\d+):(\d+):(\d+)/)) {
            end = start.replace(/\s/, 'T');
            t2 = (Date.parse(start) / 1000) + 28800;
         }
         var out = "";
         if (!isNaN(t1) && !isNaN(t2)) {
            var secs = t2 - t1;
            
            if (secs < 60) {
               return "Just now";
            }

            if (secs < 240) {
               return "A few minutes ago";
            }
            
            var mins = Math.round(secs / 60);

            if (mins < 60) {
               return mins + " minutes ago";
            }

            var hrs = Math.floor(mins / 60);
            if (hrs < 24) {
               if (hrs<2) {
                  return "An hour ago";
               }
               var s = (hrs<2) ? "" : "s";
               return hrs + " hour"+s+" ago";
            }

            var days = Math.floor(hrs / 24);
            if (days < 7) {
               if (days<2) {
                  return "Yesterday";
               }
               var s = (days<2) ? "" : "s";
               return days + " day"+s+" ago";
            }

            var weeks = Math.floor(days / 7);
            if (weeks < 4) {
               if (weeks<2) {
                  return "Last week";
               }
               var s = (weeks<2) ? "" : "s";
               return weeks + " week"+s+" ago";
            }

            var mos = Math.floor(days/30);
            if (mos < 12) {
               if (mos<12) {
                  return "Last month";
               }
               var s = (mos<2) ? "" : "s";
               return mos + " month"+s+" ago";
            }

            var yrs = Math.floor(days/365);
            if (yrs<2) {
               return "Last year";
            }
            var s = (yrs<2) ? "" : "s";
            return yrs + " year"+s+" ago";
         }
         return "";
      },
      formatDate: function(str) {
         var tyme = str.split(/\D/);
         var ampm = (tyme[3]>12) ? "pm" : "am";
         tyme[3] = (tyme[3]>12) ? tyme[3] -= 12 : tyme[3];

         return tyme[1] + '/' + tyme[2] + ' ' + tyme[3] + ':' + tyme[4] + ampm;
      },
      fetchPlayers: function(start=0, cnt=50) {
         tictac.exec("getPlayers", {"start":start,"cnt":cnt}, function(obj) {
            tictac.fillPlayers(obj['players']);
         });
      },
      checkGamesForMoves: function() {
         var lastcheck = tictac.state.lastGameCheck;

         tictac.exec("checkGames", {"id":tictac.state.me.id,since:lastcheck}, function(obj) {
         
         });
      },
      getGames: function(start=0, cnt=50) {
         tictac.exec("getGames", {"id":tictac.state.me.id,"start":start,"cnt":cnt}, function(obj) {
            if (obj.players) {
               for (var i in obj.players) {
                  tictac.data.players[i] = obj.players[i];
               }
            }
            tictac.fillGames(obj['games']);
         });
         setTimeout(function() { tictac.getGames(); }, 10000);
      },
      doLogin: function(data, player) {
         tictac.exec("login", data, function(obj) {
            console.log("Logged in as player " + obj.player + " [id:" + obj.id + "]");
            for (var i in obj) {
               tictac.state.players[player][i] = obj[i];
               tictac.state.me[i] = obj[i];
            }
            tictac.state.loggedIn = true;
            $$("fbloginButton").style.transform = "scale(0)";

            var btns = document.querySelectorAll(".button");
            for (var btn of btns) {
               btn.classList.add("ok");
            }
            setTimeout(function() {
               $$("fbloginButton").style.display = "none";
               tictac.checkInvites();
               setTimeout(function() { tictac.getGames(); }, 50);
            }, 750);
            tictac.state.inviteTimeout = setInterval(function() { tictac.checkInvites(); }, 30000);
         });
      },
      dumpAll: function() {
         var out = "";

         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               out += tictac.dumpGame(r+""+c) + "\n";
            }
         }
         return out;
      },
      dumpGame: function(game) {
         var out = "", val;

         for (var r=0; r<3; r++) {
            var row = "";
            for (var c=0; c<3; c++) {
               val = tictac.state.games["game"+game]["game"+game+r+c];
               if (!val) {
                  val = " ";
               }
               row += val;
            }
            out += row + "\n";
         }
         return out;
      },
      closeAllOverlays: function(except) {
         var olays = document.querySelectorAll(".open");
         for (var olay of olays) {
            if (olay.id != except+"Overlay") {
               tictac.closeOverlay(olay);
            }
         }

         var onimgs = document.querySelectorAll("div.button");
         for (var onimg of onimgs) {
            if (onimg.id != except+"Button") {
               onimg.classList.remove("on");
            }
         }
      },
      showOverlay: function(action) {
         tictac.closeAllOverlays(action);
         var olay = $$(action+"Overlay");
         olay.style.height = "0px";
         olay.style.width = "0px";
         olay.style.borderWidth = "0em";
         olay.style.top = tictac.state.overlay.originY + "px";
         olay.style.left = tictac.state.overlay.originX + "px";
         olay.style.display = "block";
         olay.classList.add("open");
         
         setTimeout(function() {
            if (!tictac.mobile) {
               olay.style.height = (action=="newgame") ? "500px" : "632px";
            } else {
               olay.style.height = (action=="newgame") ? "70%" : "80%";
            }
            olay.style.minWidth = "750px";
            olay.style.maxWidth = (window.innerWidth-20)+"px";

            olay.style.top = "28px";
            olay.style.borderWidth = ".5em";
            olay.style.left = ((window.innerWidth / 2) - 375) + "px";
         }, 50);
       },
      doAction: function(action, evt) {
         console.log("[doAction] " + action + " loggedin: "+tictac.state.loggedIn);
         $$(action+"Button").style.transform = "scale(.8)";
         setTimeout(function() { $$(action+"Button").style.transform = "scale(1)"; }, 500);

         if ((action && tictac.state.loggedIn) || (action=="help")) {
            tictac.state.overlay.originX = evt.clientX;
            tictac.state.overlay.originY = evt.clientY;
            tictac.state.overlay.action = action;
            setTimeout(function() { tictac.showOverlay(action); }, 300);
            
            var currentlyOn = document.querySelector(".on");
            currentlyOn && currentlyOn.classList.remove("on");
            $$(action+"Button").classList.add("on");
         } else {
            tictac.state.overlay.originX = evt.clientX;
            tictac.state.overlay.originY = evt.clientY;
            setTimeout(function() { tictac.showOverlay('error'); }, 500);
            return false;
         }

         switch(action) {
            case "invite":
               tictac.fetchPlayers();
               break;

            case "requests":
               tictac.checkInvites();
               break;
            
            case "games":
               tictac.getGames();
               break;
            
            case "settings":
               tictac.loadPage("settings");
               break;
      
            case "stats":
               tictac.loadPage("stats");
               break;
            
            case "welcome":
               tictac.loadPage("welcome");
               break;

            case "help":
               tictac.loadPage("help");
               break;

            case "newgame":
            default:
               break;

         }
      },
      loadPage: function(who, callback) {
         if (!tictac.state.pages[who]) {
            tictac.exec("getContent", {name: who}, function(response) {
               var wrapper = $$(who+"Wrapper");

               if (wrapper) {
                  wrapper.innerHTML = response.content;
               }
               if (callback) {
                  callback(response);
               }
            });
         }
      },
      restoreButtons: function(ok) {
         var btns = document.querySelectorAll(".on");
         for (var btn of btns) {
            btn.classList.remove("on");
         }
         if (tictac.state.overlay.action) {
            var btn = $$(tictac.state.overlay.action+"Button");
            btn.classList.add("on");
         }

      },
      closeOverlay: function(who, real) {
         var olay = (typeof who == "string") ? $$(who+"Overlay") : who;
         
         if (olay && ((who != tictac.state.overlay.action) || real)) {
            var btn = $$(tictac.state.overlay.action+"Button");
            if (btn) {
               btn.classList.remove("on");
            }
            olay.classList.remove("open");
            olay.style.height = "0px";
            olay.style.width = "0px";
            olay.style.borderWidth = "0em";
            olay.style.top = tictac.state.overlay.originY + "px";;
            olay.style.left = tictac.state.overlay.originX + "px";;
            var tmp = new Audio("sounds/floop2.mp3");
            tmp.play();
            setTimeout(function() {
               olay.style.display = "none";
            }, 1000);

         }
      },
      updatePlayers: function() {
         if (tictac.state.player1==tictac.state.me.id) {
            $$("player1Pic").src= tictac.state.me.photo;
            $$("player1Txt").innerHTML = tictac.state.me.player;
            
            $$("player2Pic").src= tictac.data.players[tictac.state.player2].photo;
            $$("player2Txt").innerHTML = tictac.data.players[tictac.state.player2].player;
         } else {
            $$("player1Pic").src= tictac.data.players[tictac.state.player1].photo;
            $$("player1Txt").innerHTML = tictac.data.players[tictac.state.player1].player;
         
            $$("player2Pic").src= tictac.state.me.photo;
            $$("player2Txt").innerHTML = tictac.state.me.player;
         }
      },
      accept: function(id, p1id) {
         var game = tictac.initGameObject();
         tictac.state.game = game.game;
         tictac.state.games = game.games;
         var encGame = tictac.encodeGames();
         $$("spinner").style.display = "none";
         $$("spotlight").style.display = "none";

         tictac.exec("start", {id: id, player1_id:p1id, player2_id:tictac.state.me.id, game: encGame}, function(obj) {
            tictac.data.currentGame = obj.game;
            tictac.state.game_id = obj.game.id;
	         tictac.state.won = 0;
            tictac.state.player1 = obj.game.player1_id;
            tictac.state.player2 = obj.game.player2_id;
            
            if (obj.players) {
               for (var p in obj.players) {
                  var pl = obj.players[p];
                  tictac.data.players[pl.id] = pl;
               }
            }
            var db = tictac.data.players,
                me = tictac.state.me;

            tictac.player[0] = (db[obj.game.player1_id] && db[obj.game.player1_id].player) || me.player;
            tictac.player[1] = (db[obj.game.player2_id] && db[obj.game.player2_id].player) || me.player;
            
            tictac.state.players[0] = db[obj.game.player1_id] || me;
            tictac.state.players[1] = db[obj.game.player2_id] || me;
            tictac.state.me.mymark = (tictac.state.player1 == tictac.state.me.id) ? "X" : "O";
            tictac.state.currentPlayer = 0;

            tictac.loadGame(tictac.state.game, tictac.state.games);
            tictac.updatePlayers();
            tictac.closeAllOverlays();
         });
      },
      clearWinline: function() {
         while (winline = $$("winline")) {
            winline.parentNode.removeChild(winline);
         }
      },
      updateBigGame: function(sound=true) {
         var game = tictac.state.game;
         for (let g in game) {
            var winner = game[g] || "";

            if (winner) {
               $$("container"+g).classList.add(winner+"WIN");
               var winImage = $$("img"+g); 
               if (!winImage) {
                  var winImage = document.createElement("img");
                  winImage.id = "img"+g;
                  winImage.className = "winimage";

                  $$("container"+g).appendChild(winImage);
                  // winImage.style.transform = "scale(1)";
                  
               }
               winImage.style.transform = "scale(0)";
               winImage.src = "img/" + winner + ".png";
               tictac.setNormal(winImage, 50, winner, sound);
            } 
         }      
      },
      loadGame: function(game, games) {
         $$("spinner").style.display = "none";
         tictac.clearWinline();
         tictac.state.game = game;
         tictac.state.games = games;
         tictac.state.won = 0;

         tictac.newBoard();
         var gamekey, cellkey;
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               gamekey = "game" + r + "" + c;
               for (var r1=0; r1<3; r1++) {
                  for (var c1=0; c1<3; c1++) {
                     cellkey = gamekey + r1 + "" + c1;
                     // console.log("gamekey: "+gamekey + " cellkey: "+cellkey + " val: "+games[gamekey][cellkey]);
                     if (games[gamekey][cellkey]) {
                        var mark = document.createElement("img");
                        mark.src = "img/"+games[gamekey][cellkey]+".png";
                        mark.className = "mark marked";
                        $$(cellkey).appendChild(mark); 
                     }
                  }
               }
            }
         }
         tictac.checkGames();
         tictac.updateBigGame(false);
         tictac.checkWin();
         if (tictac.mobile) {
            tictac.fillBig();
         }
      },
      setNormal: function(el, delay, winner, play=true) {
         setTimeout(function() { el.style.transform = "scale(1)"; var snd = new Audio("sounds/win"+winner+".mp3"); snd.play();}, delay);
      },
      saveGame: function() {
         tictac.exec('saveGame', {id: tictac.state.game_id, player_up: tictac.state.currentPlayer, game: tictac.encodeGames() }, function(obj) {
            console.log("Game ID "+tictac.state.game_id+" saved.");
            tictac.closeAllOverlays();
         });
      },
      play: function(id) {
         $$("spinner").style.display = "none";
         $$("spotlight").style.display = "none";
         tictac.exec("getGame", {id: id}, function(obj) {
            tictac.data.currentGame = obj;
            tictac.state.game_id = obj.id;
	         tictac.state.won = 0;
            tictac.state.player1 = obj.player1_id;
            tictac.state.player2 = obj.player2_id;
            
            var db = tictac.data.players,
                me = tictac.state.me;

            tictac.player[0] = (db[obj.player1_id] && db[obj.player1_id].player) || me.player;
            tictac.player[1] = (db[obj.player2_id] && db[obj.player2_id].player) || me.player;
            
            tictac.state.players[0] = db[obj.player1_id] || me;
            tictac.state.players[1] = db[obj.player2_id] || me;
            tictac.state.me.mymark = (tictac.state.player1 == tictac.state.me.id) ? "X" : "O";
            $$("spinner").classList.add(tictac.state.me.mymark);

            tictac.state.currentPlayer = obj.player_up;

            var gamedata = tictac.decodeGames(obj.game);
            // console.log("gameobj: "+obj.game+" gamedata: " + JSON.stringify(gamedata));
            tictac.state.game = gamedata.game;
            tictac.state.games = gamedata.games;

            tictac.loadGame(tictac.state.game, tictac.state.games);
            tictac.updatePlayers();
            tictac.closeAllOverlays();
            
            tictac.checkGames();
            tictac.clearDisabled();
            tictac.disableAll();
            tictac.clearActive();
            tictac.state.currentGame = "";

            if (obj.last_move) {
               var parts;
               if (parts = obj.last_move.match(/game(\d\d)(\d\d)/)) {
                  tictac.state.currentGame = parts[2];
               }
            }

            if (tictac.state.currentGame && tictac.state.game[tictac.state.currentGame]=="") {
               tictac.makeActive(tictac.state.currentGame);
            } else {
               tictac.state.currentGame="";
               tictac.clearDisabled();
               tictac.growAll();
            }

            if (tictac.state.players[tictac.state.currentPlayer].id != tictac.state.me.id) {
               tictac.checkForMoves();
            }

         });
          
      },
      makeActive: function(who) {
         $$('container' + who).classList.remove("disabled");
         $$('game' + who).classList.add(tictac.state.currentSymbol());
         $$('game' + who).classList.remove(tictac.state.opponentSymbol());
         $$('game' + who).parentNode.classList.remove("disabled");
         
         
         //$$("spotlightImg").src = "img/spotlights/"+who+".png";
         //$$("spotlightImg").className = "s"+who;
         if (tictac.mobile) $$("spotlight").style.height = "0";
         
         tictac.playSound("slide");
         setTimeout(function() { 
            $$('game' + who).classList.add("activeGame");
            if (tictac.mobile) {
               $$("spotlight").className = "s" + who;
               $$("spotlight").style.height = "";
               $$("spotlight").style.display = "inline-block";
               tictac.playSound("slide");
            }
         }, 600);
      },
      invite: function(id) {
         tictac.exec('invite', {player1_id: tictac.state.me.id, player2_id: id}, function(obj) {
	    var btn = $$("btnInvite_"+id);
	    btn.innerHTML = "Invited";
	    btn.classList.add("invited");
	    btn.closest("table").classList.add('dim');
            console.log("Sent invite for player ID "+id);
         });
      },
      initGameObject: function() {
         var out = {game:{}, games: {}};
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               out.game[r+""+c] = "";
               out.games["game"+r+""+c] = {};
               for (var r1=0; r1<3; r1++) {
                  for (var c1=0; c1<3; c1++) {
                     out.games["game"+r+""+c]["game"+r+""+c+""+r1+""+c1] = "";
                  }
               }
            }
         }
         return out;
      },
      cancelInvite: function(id) {
         tictac.exec("cancelInvite", {id: id}, function(obj) {
            console.log("Invite ID "+id+" cancelled.");
         });
      },
      checkForMoves: function() {
         tictac.exec("getMoves", {for_player_id: tictac.state.me.id, game_id: tictac.state.game_id}, function(obj) {
            if (obj.moves.length) {
               for (var i in obj.moves) {
                  tictac.move(obj.moves[i].move, obj.moves[i].mark, true);
                  tictac.exec("ackMove", {id: obj.moves[0].id}, function(msg) {
                     console.log(msg.data.msg);
                  });
               }
            }
         });
         setTimeout(function() {
            if (tictac.state.players[tictac.state.currentPlayer].id != tictac.state.me.id) {
               tictac.checkForMoves();
            }
         }, 3000);
      },
      doNotify: function(str, icon, title) {
         if (Notification.permission === "granted") {
            var options = { 
               body: str,
               icon: icon
            };
            return new Notification(title, options);
         } else {
            return false;
         }
      },
      encodeGames: function() {
         var val=1, 
             out = [];
         
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               var tmp = tictac.encodeGame(tictac.state.games["game"+r+""+c], "game"+r+""+c);
               out.push(tmp.toString(16));
            }
         }
         out.push(tictac.encodeGame(tictac.state.game, ""));
         return out.join(":");
      },
      encodeGame: function(game, g) {
         var val = {X:1, O:512}, out=0, X=0, O=0;
         
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {

               if (game[g+""+r+""+c]!="") {
                  out += val[game[g+""+r+""+c]];
               }
               val.X *= 2;
               val.O *= 2;
            }
         }
         return out;
      },
      decodeGame: function(encGame, g="") {
         var val = {X:1, O:512},
             game = {};

         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               if (encGame & val.X) {
                  game[g+""+r+""+c] = "X";
               } else if (encGame & val.O) {
                  game[g+""+r+""+c] = "O";
               } else {
                  game[g+""+r+""+c] = "";
               }
               val.X *= 2;
               val.O *= 2;
            }
         }
         return game; 
      },
      decodeGames: function(gameStr) {
         var val = 1;
         var games = {};
         var arr = gameStr.split(/:/);
         var out = {game:{}, games:{}};
         
         for (var r=0; r<3; r++) {
            for (var c=0; c<3; c++) {
               out.games["game"+r+""+c] = tictac.decodeGame(parseInt(arr.shift(),16), "game"+r+""+c);
            }
         }
         out.game = tictac.decodeGame(parseInt(arr.shift(),16), "");

         return out;
      },
      newBoard: function() {
         var board = "";
         for (var r=0; r<3; r++) {
            board += "<tr>";
            for (var c=0; c<3; c++) {
               board += "<td id='container"+r+""+c+"' class='game_cell game_row"+r+" game_col"+c+" disabled'><table class='game' id='game"+r+""+c+"'>";
               for (var r1=0; r1<3; r1++) {
                  board += "<tr>";
                  for (var c1=0; c1<3; c1++) {
                     board += "<td id='game"+r+""+c+""+r1+""+c1+"' class='cell row"+r1+" col"+c1+"'></td>";
                  }
                  board += "</tr>";
               }
               board += "</table></td>";
            }
            board += "</tr>";
         }
         $$("gameboard").innerHTML = board;
      },
      extend: function(obj) {
         for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
               if (tictac[i]) {
                  tictac["_"+i] = tictac[i];
               }
               tictac[i] = obj[i];
            }
         }
      },
      grow: function(who, delay=0) {
         var w = $$(who);
         if (!w.parentNode.classList.contains('XWIN') && !w.parentNode.classList.contains('OWIN')) {
            setTimeout(function() { 
               w.classList.add("hop");
            }, delay); 
            setTimeout(function() { 
               w.classList.remove("hop");
            }, delay+150); 
         }
      },
      growAll: function() {
         var delay = 150; 
         for (var g of document.querySelectorAll("table.game")) { 
            if (g.id) { 
               tictac.grow(g.id, delay); 
               delay += 150; 
            } 
         
         }

      }

   }
   window.$$ = $$ = function(el) { return document.getElementById(el); };
   var btns = document.querySelectorAll(".button > img");
   for (var i=0; i<btns.length; i++) {
      var btn = btns[i];
      btn.addEventListener("click", function(event) {
         tictac.doAction(event.currentTarget.id, event);
         tictac.sounds['pop'].volume = .5;
         tictac.sounds['pop'].play();
      });
      btn.addEventListener("mouseover", function(event) {
         var tmp = new Audio("sounds/tick.mp3");
         tmp.volume = .25;
         tmp.play();
      });
   }
   var btn = $$("fblogin");
   btn.addEventListener("click", function(event) {
      tictac.sounds['pop'].volume = .5;
      tictac.sounds['pop'].play();
   });
   btn.addEventListener("mouseover", function(event) {
      var tmp = new Audio("sounds/tick.mp3");
      tmp.volume = .25;
      tmp.play();
   });

   var btns = ['invite','games','help','requests','settings','stats','fblogin'];
   for (let b of btns) {
      var btn = $$(b+"Button");
      btn.addEventListener("click", function(event) {
         var who = event.currentTarget;
         who.style.transform = "scale(.8)";
      });
   }
   tictac.init();
   
})(window);


