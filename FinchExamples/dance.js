// Gain access to our finch
var finch = new playground.Finch();

// How long, in milliseconds, is each beat?
var beatTime = 500;
    
// Get the timer singleton
var timer = qx.util.TimerManager.getInstance();


// A dance is composed of a series of instructions which are executed in
// order. We also maintain an index of which instruction to execute next.
var musicData =
{
  // The list of instructions, to be executed in order.
  instructions :
  [
    { left : -50, right :  50, beats : 4, led : [255, 0, 0 ] },
    { left :   0, right :   0, beats : 4, led : [0, 255, 0 ] },
    { left :  50, right : -50, beats : 4, led : [0, 0, 255 ] },
    { left :  50, right :  50, beats : 2, led : [255, 0, 0 ] },
    { left : -50, right : -50, beats : 2, led : [0, 255, 0 ] },
    
    // Stop the Finch at dance end
    { left :   0, right :   0, beats : 0, led : [0, 0, 0 ] }
  ],
  
  // Which instruction to execute next
  nextInstruction : 0
};


// Start the next movement, and if there are remaining movements, set a timer
// so that we are called again at the appropriate time for the next movement.
//
// The function is called immediately, for the initial movement.
//
(function ()
 {
   // Get the instruction map for the movement to be executed
   var instruction = musicData.instructions[musicData.nextInstruction++];
   
   // Start the Finch moving per the instruction
   finch.setWheelPower(instruction.left, instruction.right);
  
   // Set the LEDs
   finch.setBeakColor(instruction.led[0],
                      instruction.led[1],
                      instruction.led[2]);

   // If this isn't the last instruction...
   if (musicData.instructions.length > musicData.nextInstruction)
   {
     // ... then start a timer to call ourself again for the next one.
     timer.start(arguments.callee, 0, this, null, instruction.beats * beatTime);
   }
 })();
