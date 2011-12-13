
IMAGE_SOURCE = 'images/tiles.png';
TILE_HEIGHT = 306;
TILE_WIDTH  = 354;
TILE_OFFSET = 86;                  // the horizontal offset of the hexagon

SCALE_HEIGHT = 85;
SCALE_WIDTH  = 98;
SCALE_OFFSET = 24;

TEXT_XOFFSET =  5;
TEXT_YOFFSET = -5;
// if we have multiple digits we have to shift over to make our text center
TEXT_DD_OFFSET = -1;

// Chit constants
CHIT_RADIUS             = 15;
CHIT_FONT               = "12pt sans-serif";
CHIT_FONT_COLOR         = "white";
CHIT_ROBBER_COLOR       = "black";
CHIT_DEFAULT_COLOR      = "brown";
CHIT_DEFAULT_RIM_COLOR  = "black";
// inner ring color for high probability chits (8 and 6)
CHIT_HIGH_PROB_COLOR    = "red";
// inner ring color for low probability chits (2 and 12)
CHIT_LOW_PROB_COLOR     = "grey";
CHIT_DEFAULT_PROB_COLOR = "brown";

BOARD_SIZE = 600;

OCEAN     = 0;
FOREST    = 1;
PASTURE   = 2;
FIELDS    = 3;
HILLS     = 4;
MOUNTAINS = 5;
DESERT    = 6;

WEST      = 0;
NORTHWEST = 1;

HOSTNAME = 'http://localhost:5000';

// a[x] is the indices of (first good vertex, last good vertex)
rows = [[0,6], [0,8], [0,10], [1,11], [3,11], [5,11]];
//a[y] is the number of vertices that occur before row y
indices = [0, 7, 16, 27, 38, 47];


// GLOBALS BELOW, CONSTANTS ABOVE
// we shall code in the shade
// 'til we run out of rum.

gameID = -1;
// at some point this needs to be gotten from the server
userID = 1;

// shows where we are in the sequence of actions for this game.
sequenceNum = 0;

// actions to commit at the end of the user's turn
actionsMade = [];