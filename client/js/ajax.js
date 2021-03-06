"use strict";

// All our handlers for action events
// req events are handled seperately, as we only care about them if they
// are on the top of the log. See handleResponseJson().
var handlers = {
    "joined"              : handle_joined,
    "resources_gained"    : handle_resources_gained,
    "hexes_placed"        : handle_hexes_placed,
    
    "settlement_built"    : function(log_entry) {
        tickerName(log_entry.user, "built a settlement!");
        insertSettlement(log_entry.user, log_entry.vertex, true);
    },

    "settlement_upgraded" : handle_settlement_upgraded,

    "road_built" : function(log_entry) {
        tickerName(log_entry.user, "built a road!");
        insertRoad(log_entry.user, log_entry.vertex1, log_entry.vertex2, true);
    },

    "rolled": function(log_entry) {
        tickerName(log_entry.user, "rolled a " + log_entry.rolled);
    },
    
    "req_robber" : function(log_entry) {
        tickerName(log_entry.user, "must move the robber");
    },
   
    "robber_moved" : handle_robber_moved,
    
    "setup" : function(log_entry) {
        insertSettlement(log_entry.user, log_entry.settlement);
        insertRoad(log_entry.user, log_entry.settlement, log_entry.road_to);
    }
}

var req_handlers = {
    "req_turn" : do_turn,
    "req_setup" : do_setup,
    "req_robber" : do_robber
}

function promptVertex(accept) {
    var dfd = $.Deferred();

    accept.forEach(function(i) {
        drawSettlementDetector(stage, i). then(settlementChosen);
    });

    function settlementChosen(p) {
        stage.removeAll();
        dfd.resolve(p)
    }

    return dfd.promise();
}

function promptSetupSettlement() {
    var accept = getValidDistanceRule();
    return promptVertex(accept);
}

function promptNewSettlement() {
    var accept = [];
    var distanceRule = getBadDistanceRule();
    var settlements = gameboard.settlements;
    for(var i in gameboard.roads[userID]) {
        var r = gameboard.roads[userID][i];
        if(
            r.user == userID &&
            !(r.vertex2 in distanceRule)
        ) {
            accept.push(r.vertex2);
        }
        if(
            r.user == userID &&
            !(r.vertex1 in distanceRule)
        ) {
            accept.push(r.vertex1);
        }
    }

    return promptVertex(accept);
}

//if p is passed, allow only roads from position p
function promptRoad(p) {
    var dfd = $.Deferred();

    var valid;

    if (p !== undefined) {
        valid = getRoadsFromVertex(p);
    }
    else {
        valid = getValidRoadPlaces();
    }

    for (var i in valid) {
        drawRoadDetector(stage, valid[i]).then(roadChosen);
    }

    function roadChosen(p) {
        stage.removeAll();
        dfd.resolve(p);
    }

    return dfd.promise();
}

function promptUpgradeSettlement() {
    var valid = getValidSettlementUpgrades();

    for (var v in valid) {
        drawCityDetector(starge, valid[v]);
    }
}

function end_turn() {
    $.ajax("/end_turn?game=" + gameID);
}

function handle_joined(log_entry) {
    var user = {};
    user.id = log_entry.user;

    gameboard.scores[user.id] = 0;
    user.color = usercolors.pop();
    gameboard.users[log_entry.user] = user;

    tickerName(user.id, "joined!");
}



function handle_resources_gained(log_entry) {
    var cards = log_entry.cards;

    if(log_entry.user == userID) {
        //Add to cards owned.
        cards.forEach(
            function(card) {
                gameboard.cards[cardNames[card[1]]] += card[0];
            }
        );
        updateResources();
    }

    //Put a message in the ticker
    function format_single(card) {
        return card[0] + " " + cardNames[card[1]];
    }

    var message = "got";

    if(cards.length > 0) {
        message += " " + format_single(cards[0]);
    }

    for(var i = 1; i < cards.length - 1; i++) {
        message += ", " + format_single(cards[i]);
    }

    if(cards.length > 1) {
        if(cards.length >= 3) message += ", and";
        else message += " and"

        message += " " + format_single(cards[cards.length - 1]);
    }

    tickerName(log_entry.user, message);
}

function do_setup(log_entry) {
    var settlement;

    promptSetupSettlement().done(gotSettlement)

    function gotSettlement(p) {
        settlement = p;
        drawSettlement(p, gameboard.users[userID].color);
        promptRoad(p).done(gotRoad);
    }

    function gotRoad(r) {
        r.user = userID;
        drawRoad(r);

        //The roadto is the one that doesn't equal the settlement
        var roadto = r.vertex1 != settlement ? r.vertex1 : r.vertex2
        makeSetupRequest(settlement, roadto);
    }

    function makeSetupRequest(settlement, roadto) {
        makeAjaxRequest("/setup",
                    "?game=" + gameID
                    + "&settlement=" + settlement
                    + "&roadto=" + roadto,
                    function(json) {}
                   );
    }
}

function handle_hexes_placed(log_entry) {
    sendToTicker("Initializing the board...");
    initBoard(log_entry.args);
}

function handle_settlement_upgraded(log_entry) {
    sendToTicker(name(log_entry.user) + " upgraded a settlement!");
}

function handle_robber_moved(log_entry) {
    tickerName(log_entry.user, "moved the robber");
    gameboard.robber = log_entry.to
}

function do_robber(log_entry) {
    var choose_location = promptRobber();
    var choose_steal_from = choose_location.pipe(function(moveto) {
        var valid = hex_adjacent(moveto).filter(function(h) {
            return h in gameboard.settlements && gameboard.settlements[h].user !== userID;
        });

        var dfd = $.Deferred();

        if(valid.length > 1) {
            promptVertex(valid).done(function(stealfrom) { 
                dfd.resolve(moveto, stealfrom);
            });
        } else if(valid.length === 1) {
            dfd.resolve(moveto, valid[0])
        } else {
            dfd.resolve(moveto);
        }

        return dfd.promise();
    })

    choose_steal_from.pipe(function(moveto, stealfrom) {
        var data = { game: gameID, moveto: moveto };
        if(stealfrom !== undefined) {
            data.stealfrom = gameboard.settlements[stealfrom].user;
        }
        
        $.get("/move_robber", data);
    });
}

function do_turn(log_entry) {
    function send_update_new_settlement(p) {
        insertSettlement(userID, p, true);
        $.get(HOSTNAME + "/build_settlement", {"vertex" : p, "game" : gameID});

        do_build();
    }

    function send_update_new_road(p) {
        insertRoad(userID, p.vertex1, p.vertex2, true);
        $.get(HOSTNAME + "/build_road", {"vertex1" : p.vertex1, "vertex2" : p.vertex2, "game" : gameID});

        do_build();
    }

    function do_build() {
        stage.removeAll();
        if(hasRoadResources()) {
            promptRoad().then(send_update_new_road);
        }
        if(hasSettlementResources()) {
            promptNewSettlement().then(send_update_new_settlement);
        }
    }

    $("#done").show(1000);
    do_build();
}

function promptRobber() {
    var dfd = $.Deferred();

    VALID_HEXES.forEach(function(h) {
        if(h !== gameboard.robber) {
            drawChitDetector(stage, h).done(gotRobber);
        }
    });

    function gotRobber(h) {
        //TODO: Come up with a more-fine grained approach.
        stage.removeAll();
        dfd.resolve(h);
    }

    return dfd.promise();
}

// The result of the ajax request will json which is then passed to
// the given callback func.
function makeAjaxRequest(url, params, callbackFunc) {
    var xmlhttp;
    xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            callbackFunc(xmlhttp.responseText);
        }
    }

    xmlhttp.open("GET", url + params, true);
    xmlhttp.send();
}


function handleResponseJson(json) {
    var myJson = JSON.parse(json);


    window.img = new Image();
    img.onload = function() {


        if(myJson.log && myJson.sequence && myJson.log.length > 0) {

            // update our sequence number
            sequenceNum = myJson.sequence;

            // take care of everything else
            var log = myJson.log;

            var last_req = null;
            for(var x = 0; x < myJson.log.length; x++) {
                var log_entry = log[x];
                if (handlers[log_entry.action]) {
                    handlers[log_entry.action](log_entry);
                }

                if(req_handlers[log_entry.action]) {
                    last_req = log_entry;
                }
            }

            if(last_req) {
                updatePlayerDisplay(last_req.user);
                window.currentUserID = last_req.user;
                stage.removeAll();

                if(userID === last_req.user) {
                    req_handlers[last_req.action](last_req);
                }
            }

            updateClient();

        }
        else {
            console.log("Malformed json returned");

            setTimeout("updateClient()",3000);
            // stuff is really messed up, so go ahead and reload the page
        }

    }

    img.src = IMAGE_SOURCE;
}

function joinGame() {
    makeAjaxRequest(HOSTNAME + "/join_game", "?game=" + gameID,
                    function(json) {updateClient();});
}

function updateClient() {
    makeAjaxRequest(HOSTNAME + "/get_log",
                    "?sequence=" + sequenceNum
                    + "&game=" + gameID,
                    handleResponseJson);
}

// currently a huge hack, just so we can get the starting board layout.
function startGameRequest() {

    var create_game_callback = function(json) {
        window.gameID = parseInt(json);
        console.log("created new game with gameID: " + gameID);
        sendToTicker("New game created!");
        sendToTicker("Waiting for players...");

        window.location = HOSTNAME + "/game.html#" + gameID;

        updateClient();
    }

    makeAjaxRequest(HOSTNAME + "/create_game", "",
                   create_game_callback);
}
