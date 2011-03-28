/*
 * Interface to the Finch robot
 *
 *   Copyright:
 *     2011 Derrell Lipman
 *
 *   License:
 *     LGPL: http://www.gnu.org/licenses/lgpl.html
 *     EPL: http://www.eclipse.org/org/documents/epl-v10.php
 *     See the LICENSE file in the project's top-level directory for details.
 
 */

/**
 * This class provides the interface to the Finch robot.
 */
qx.Class.define("playground.Finch",
{
  extend : qx.core.Object,

  construct : function()
  {
    this.base(arguments);
    
    // Initialize for remote procedure calls to the Finch high-level API
    this.__rpc = new qx.io.remote.Rpc();
    this.__rpc.setTimeout(6000);
    this.__rpc.setUrl("/rpc");
    this.__rpc.setServiceName("finch.high");
    
    // Issue an initial request to get the server connected to the Finch.
    // We'll ignore the results with an empty function.
    this.__rpc.callAsync(function(e){}, "getAllSensors");
    
    // Get the timer singleton
    this.__timer = qx.util.TimerManager.getInstance();
  },

  events :
  {
    /**
     * Fired when sensor data is available, as a result of having begun sensor
     * data collection via a call to startSensorDataCollection(). The data
     * will be a map containing the following members:
     *
     *   accelerometer --
     *   a map containing fields 'x', 'y', and 'z' values, each in the range
     *   [-1.5, 1.5].
     *  
     *   light --
     *   a map containing 'left' and 'right' values, each in the range [0, 255].
     *  
     *   obstacle --
     *   a map containing 'left' and 'right' values, each of which is a boolean
     *   indicating that an obstacle is detected.
     *  
     *   temperature --
     *   a floating point value indicating the temperature in degrees Celsius.
     *
     *
     * <p>
     * The data can be accessed via the event parameter's getData() method:
     * </p>
     *
     * <pre class='javascript'>
     * function _onSensorData(e)
     * {
     *   var sensorData = e.getData();
     *   alert("Left obstacle sensor: " + sensorData.obstacle.left);
     * }
     * </pre>
     * 
     * That listener function, _onSensorData, can be registered to receive
     * 'sensorData' events by calling addListener():
     * 
     * <pre class='javascript'>
     * this.addListener("sensorData", _onSensorData, this);
     * </pre>
     * 
     * The optional third parameter provides the context in which the event
     * handler function should be called. If not provided, this Finch object
     * will be used as the context (which is equivalent to passing 'this').
     */
    "sensorData" : "qx.event.type.Data"
  },

  members :
  {
    /** The single RPC object */
    __rpc  : null,    
    
    /** Handle to a current remote procedure call in progress */
    __hRpc : null,
    
    /** The timer singleton used for all timers */
    __timer : null,
    
    /** Frequency at which data is collected, in milliseconds */
    __dataCollectionFrequency : null,
    
    /** The time for the next getAllSensors() request */
    __nextDataCollectionTime : 0,

    /**
     * Start collecting sensor data. Sensor data will be collected at a
     * frequency indicated by the parameter, and a "sensorData" event will be
     * generated each time the data is retrieved from the robot at about that
     * frequency.
     *
     * @param msFrequency {Integer}
     *   The frequency, in milliseconds, that sensor data should be requested
     *   from the robot. For polling as fast as the data can be retrieved, use
     *   a value of zero.
     */
    startSensorDataCollection : function(msFrequency)
    {
      // Ensure we were given a non-negative integer for the frequency.
      if (typeof msFrequency != "number" || 
          msFrequency < 0 ||
          msFrequency != msFrequency.toFixed(0))
      {
        throw new Error("frequency must be a non-negative integer; " +
                        "got " + msFrequency +
                        " (type " + typeof(msFrequency) + ")");
      }

      // Save the polling frequency
      this.__dataCollectionFrequency = msFrequency;

      // Determine the time for the _next_ request should be issued
      this.__nextDataCollectionTime = new Date().getTime() + msFrequency;

      // If there's a request in progress, let it run. Otherwise, start one.
      if (! this.__hRpc)
      {
        this.__hRpc = this.__rpc.callAsync(
          qx.lang.Function.bind(this.__rpcHandler, this),
          "getAllSensors");
      }
    },
    
    /**
     * Stop collecting sensor data.
     */
    stopSensorDataCollection : function()
    {
      if (this.__hRpc)
      {
        this.__hRpc.abort();
        this.__hRpc = null;
        this.__nextDataCollectionTime = 0;
      }
    },


    /**
     * Play a tone on the Finch buzzer.
     *
     * @param frequency {Integer}
     *   The frequency, in HZ, of the tone to be played. Setting a frequency
     *   of zero causes any playing tone to stop playing.
     *
     * @param msDuration {Integer}
     *   The duration, in milliseconds, that the tone should play for.
     */
    playTone : function(frequency, msDuration)
    {
      // Validate parameters
      if (typeof frequency != "number" || 
          frequency < 0 ||
          frequency != frequency.toFixed(0))
      {
        throw new Error("The frequency must be a non-negative integer; " +
                        "got: " +
                        frequency + " (type " + typeof(frequency));
      }
        
      if (typeof msDuration != "number" || 
          msDuration < 0 ||
          msDuration != msDuration.toFixed(0))
      {
        throw new Error("The duration must be a non-negative integer; " +
                        "got: " +
                        msDuration + " (type " + typeof(msDuration));
      }

      // Play a tone of the specified frequency, for the specified time
      this.__rpc.callAsync(
        function(result, ex, id)
        {
          if (ex != null)
          {
            if (window.console)
            {
              console.log("playTone(" + id + ") exception: " + ex);
            }
          }
        },
        "playTone",
        frequency,    // frequency
        msDuration);  // duration in ms
    },


    /**
     * Set the Finch's beak color.
     *
     * @param red {Integer}
     *   Number, in the range [0, 255], of the red component of the color.
     *
     * @param green {Integer}
     *   Number, in the range [0, 255], of the green component of the color.
     *
     * @param blue {Integer}
     *   Number, in the range [0, 255], of the blue component of the color.
     */
    setBeakColor : function(red, green, blue)
    {
      // Validate parameters
      if (typeof red != "number" || 
          red < 0 || red > 255 ||
          red != red.toFixed(0) ||
          typeof green != "number" || 
          green < 0 || green > 255 ||
          green != green.toFixed(0) ||
          typeof blue != "number" || 
          blue < 0 || blue > 255 |
          blue != blue.toFixed(0))
      {
        throw new Error("Beak colors must be non-negative integers " +
                        "in [0, 255]; got: " +
                        "red = " + red + " (type " + typeof(red) + "); " +
                        "green = " + green + " (type " + typeof(green) + "); " +
                        "blue = " + blue + " (type " + typeof(blue) + ")");
      }

      // Set the Finch's beak color
      this.__rpc.callAsync(
        function(result, ex, id)
        {
          if (ex != null)
          {
            if (window.console)
            {
              console.log("setLED(" + id + ") exception: " + ex);
            }
          }
        },
        "setLED",
        red,
        green,
        blue);
    },


    /**
     * Set the power of each wheel. Negative values cause the Finch to move in
     * reverse.
     *
     * @param left {Integer}
     *   Number, in the range [-255, 255], for the left wheel power
     *
     * @param right {Integer}
     *   Number, in the range [-255, 255], for the right wheel power.
     */
    setWheelPower : function(left, right)
    {
      // Validate parameters
      if (typeof left != "number" || 
          left < -255 || left > 255 ||
          left != left.toFixed(0) ||
          typeof right != "number" || right != right.toFixed(0))
      {
        throw new Error("Wheel powers must be integers in [-255, 255]; got: " +
                        "left = " + left + " (type " + typeof(left) + "); " +
                        "right = " + right + " (type " + typeof(right) + ")");
      }

      // Set the wheel powers
      this.__rpc.callAsync(
        function(result, ex, id)
        {
          if (ex != null)
          {
            if (window.console)
            {
              console.log("setWheelPower(" + id + ") exception: " + ex);
            }
          }
        },
        "setWheelPower",
        left,
        right);
    },



    // Not using the name 'reset' to avoid overriding qx.core.Object.reset
    /**
     * Disconnect from the Finch. Any subsequent call will reconnect to it.
     */
    disconnect : function()
    {
      // Reset the Finch
      this.__rpc.callAsync(
        function(result, ex, id)
        {
          if (ex != null)
          {
            if (window.console)
            {
              console.log("reset(" + id + ") exception: " + ex);
            }
          }
        },
        "reset");
    },


    /**
     * Handler to display the results of the getAllSensors request
     *
     * @param result {Map}
     *   If successful, this will contain a map with the sensor values
     *
     * @param ex {Exception}
     *   If unsuccessful, this will contain the exception object. If successful,
     *   this will be null.
     *
     * @param id {Number}
     *   The id value of the request whose result or failure is being indicated.
     *
     */
    __rpcHandler : function(result, ex, id)
    {
      // If there was no error, ...
      if (ex == null) 
      {
        // ... then dispatch an event to any awaiting listeners
        this.fireDataEvent("sensorData", result);

        // Determine when it's time to issue the new request
        var currentTime = new Date().getTime();
        var f = qx.lang.Function.bind(this.__rpcHandler, this);
        if (currentTime >= this.__nextDataCollectionTime)
        {
          // Re-issue the request right now
          this.__hRpc = this.__rpc.callAsync(f, "getAllSensors");
        }
        else
        {
          // It's not time yet. Wait until it's time, then issue the request.
          this.__timer.start(
            function(userData, timerId)
            {
              // Determine the time for the _next_ request should be issued
              this.__nextDataCollectionTime =
                new Date().getTime() + this.__dataCollectionFrequency;

              // Issue the request now.
              this.__hRpc = this.__rpc.callAsync(f, "getAllSensors");
            },
            0,
            this,
            null,
            this.__nextDataCollectionTime - currentTime);
        }
      }
      else if (window.console)
      {
        console.log("getAllSensors(" + id + ") exception: " + ex);          
      }
    }
  },


  destruct : function() {
    if (this.__hRpc)
    {
      this.__hRpc.abort();
      this.__hRpc = null;
    }
  }
});
