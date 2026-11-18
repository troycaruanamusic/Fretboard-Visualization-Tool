// Fretboard Trainer · CAGED windows and dot colours.
// Neutral dots (DS-05): a value step, chord tones light and other scale tones muted, both with ink labels.
export const NEUTRAL_CT = "#E3E9F0", NEUTRAL_OTHER = "#A9B6C4";

// Calmer CAGED set (decision 7 = b), all with ink labels (DS-04).
export const POS_COLOR = {C:"#E5766B",A:"#E9A15C",G:"#DDD05A",E:"#7FA8E6",D:"#7CC68D"};
// Nut-substitute hatch: the second stripe per position colour, 1.5:1 against it; ink labels stay at 4.6:1 or more on both stripes.
export const HATCH = {C:"#efa9a2",A:"#bb834e",G:"#b3aa4d",E:"#b6cdf1",D:"#c5e6cd"};
export const POS_MAJOR = [{num:1,letter:"C",off:4,w:3},{num:2,letter:"A",off:6,w:3},{num:3,letter:"G",off:9,w:3},{num:4,letter:"E",off:-1,w:3},{num:5,letter:"D",off:1,w:4}];
export const POS_MINOR = [{num:1,letter:"C",off:4,w:4},{num:2,letter:"A",off:7,w:3},{num:3,letter:"G",off:9,w:3},{num:4,letter:"E",off:0,w:3},{num:5,letter:"D",off:2,w:3}];
