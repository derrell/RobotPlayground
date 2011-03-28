// Gain access to our finch
var finch = new playground.Finch();

// A place to hold the previous tone, to avoid resending requests to stop
// the music.
var lastTone = 0;
			
// Add a place to put the four sensor values during each event, for debugging
var sensors = {};


/**
 * Determine if the left obstacle sensor is detecting an obstacle
 *
 * @param sensorData {Map}
 *   Map containing the sensor data.
 *
 * @return {Boolean}
 *   true if the sensor is detecting an obstacle;
 *   false otherwise
 */
function isLeftObstacle(sensorData)
{
  sensors["obstacle.left"].setValue(sensorData.obstacle.left.toString());
  return sensorData.obstacle.left;
}


/**
 * Determine if the right obstacle sensor is detecting an obstacle
 *
 * @param sensorData {Map}
 *   Map containing the sensor data.
 *
 * @return {Boolean}
 *   true if the sensor is detecting an obstacle;
 *   false otherwise
 */
function isRightObstacle(sensorData)
{
  sensors["obstacle.right"].setValue(sensorData.obstacle.right.toString());
  return sensorData.obstacle.right;
}

/**
 * Determine if the left light sensor is detecting lots of light. This
 * converts the "analog" light value in the range [0, 255] to a boolean value
 * that reflects whether the light is being blocked from the sensor.
 *
 * @param sensorData {Map}
 *   Map containing the sensor data.
 *
 * @return {Boolean}
 *   true if the sensor detects only a small amount of light
 *   false otherwise
 */
function isLeftLight(sensorData)
{
  sensors["light.left"].setValue(sensorData.light.left.toString());
  return sensorData.light.left > 50;
}

/**
 * Determine if the right light sensor is detecting lots of light. This
 * converts the "analog" light value in the range [0, 255] to a boolean value
 * that reflects whether the light is being blocked from the sensor.
 *
 * @param sensorData {Map}
 *   Map containing the sensor data.
 *
 * @return {Boolean}
 *   true if the sensor detects only a small amount of light
 *   false otherwise
 */
function isRightLight(sensorData)
{
  sensors["light.right"].setValue(sensorData.light.right.toString());
  return sensorData.light.right < 50;
}

/*
 * Convert the "button press" data, as determined by the sensor values,
 * into an integer value in the range [0, 15].
 */
function currentButtonsPressed(sensorData) 
{
  // Create a 4-bit value by considering each sensor to be a bit
  return ((isLeftObstacle(sensorData)   ? 1 << 3 : 0) |
          (isRightObstacle(sensorData)  ? 1 << 2 : 0) |
          (isLeftLight(sensorData)      ? 1 << 1 : 0) |
          (isRightLight(sensorData)     ? 1 << 0 : 0));
}

/**
 * Get a value in [0, 15] corresponding to which "buttons" are pressed, and
 * convert that number to a frequency code which can be played.
 *
 * @param sensorData {Map}
 *   Map containing the sensor data.
 *
 * @return
 *   An integer frequency value which can be provided to the Finch
 *   object's playTone() method.
 */
function getFrequency(sensorData)
{
  var freqs = 
    [
      0,                        // off
      523,                      // C
      554,                      // C#
      587,                      // D
      622,                      // D#
      659,                      // E
      698,                      // F
      739,                      // F#
      784,                      // G
      831,                      // G#
      880,                      // A
      932,                      // A#
      987,                      // B
      1047,                     // C
      1109,                     // C#
      1175                      // D
    ];
					
    return freqs[currentButtonsPressed(sensorData)];
}


/**
 * Event handler function. This function is called when sensor data is
 * available.
 *
 * @param e {qx.event.type.Data}
 *   An event object. The sensor data can be retrieved with e.getData()
 */
function _onSensorData(e)
{
  lastTone = tone;
  var tone = getFrequency(e.getData());
	
  if( tone != 0 )
  {		
    finch.playTone(tone, 5000);
  }
  else if (lastTone != 0)
  {
    finch.playTone(lastTone, 0);
  }
}


//
// MAIN PROGRAM
//


// Add a listener for sensor data
finch.addListener("sensorData", _onSensorData);

// Add a vertical box layout for each of our controls
var vbox = new qx.ui.container.Composite(new qx.ui.layout.VBox());
this.getRoot().add(power, { left : 10, top : 10 });
                  
// Create a checkbox to turn on and off the flute "power""
var power = new qx.ui.form.CheckBox("Power");
power.addListener("changeValue",
                  function(e)
                  {
                    // Is the checkbox being turned on?
                    if (e.getData)
                    {
                      // Yup. Start getting sensor data
                      finch.startSensorDataCollection(0);
                    }
                    else
                    {
                      // The checkbox is being turned off. Stop data colleciton.
                      finch.stopSensorDataCollection();
                    }
                  });


// Add the power checkbox
vbox.add(power);

// Populate the sensor array with form fields for debugging
sensors["obstacle.left"] = new qx.ui.form.Text();
sensors["obstacle.right"] = new qx.ui.form.Text();
sensors["light.left"] = new qx.ui.form.Text();
sensors["light.right"] = new qx.ui.form.Text();
for (sensorName in sensors)
  {
    vbox.add(sensors[sensorName]);
  };

// Turn on the power now, at program start
power.setValue(true);
