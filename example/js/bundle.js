(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Tooltip = require('../../');
var MAPBOX_TOKEN = 'pk.eyJ1IjoidzhyIiwiYSI6IlF2Nlh6QVkifQ.D7BkmeoMI7GEkMDtg3durw';

L.Icon.Default.imagePath = 'http://cdn.leafletjs.com/leaflet-1.0.0-b1/images'

var map = global.map = L.map('map', {
  editable: true
}).setView([31.2352, 121.4942], 15);
map.addLayer(new L.TileLayer(
  'https://a.tiles.mapbox.com/v4/mapbox.streets-basic/{z}/{x}/{y}.png?access_token=' + MAPBOX_TOKEN)
);

L.EditControl = L.Control.extend({
  options: {
    position: 'topleft',
    callback: null,
    kind: '',
    html: ''
  },

  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
        link = L.DomUtil.create('a', '', container);

    link.href = '#';
    link.title = 'Create a new ' + this.options.kind;
    link.innerHTML = this.options.html;
    L.DomEvent
      .on(link, 'click', L.DomEvent.stop)
      .on(link, 'click', function () {
        window.LAYER = this.options.callback(null, {});
    }, this);

    return container;
  }
});

L.NewLineControl = L.EditControl.extend({
  options: {
    position: 'topleft',
    callback: L.Util.bind(map.editTools.startPolyline, map.editTools),
    kind: 'line',
    html: '\\/\\'
  }
});

L.NewPolygonControl = L.EditControl.extend({
  options: {
    position: 'topleft',
    callback: L.Util.bind(map.editTools.startPolygon, map.editTools),
    kind: 'polygon',
    html: '▰'
  }
});

L.NewMarkerControl = L.EditControl.extend({
  options: {
    position: 'topleft',
    callback: L.Util.bind(map.editTools.startMarker, map.editTools),
    kind: 'marker',
    html: '🖈'
  }
});

L.NewRectangleControl = L.EditControl.extend({
  options: {
    position: 'topleft',
    callback: L.Util.bind(map.editTools.startRectangle, map.editTools),
    kind: 'rectangle',
    draggable: true,
    html: '⬛'
  }
});

L.NewCircleControl = L.EditControl.extend({
  options: {
    position: 'topleft',
    callback: L.Util.bind(map.editTools.startCircle, map.editTools),
    kind: 'circle',
    html: '⬤'
  }
});

[
  new L.NewMarkerControl(),
  new L.NewLineControl(), new L.NewPolygonControl(),
  new L.NewRectangleControl(), new L.NewCircleControl()
].forEach(map.addControl, map);


var bounds = map.getBounds().pad(0.25); // slightly out of screen
var tooltip = L.tooltip({
  position: 'left',
  noWrap: true
})
  .addTo(map)
  .setContent('Start drawing to see tooltip change')
  .setLatLng(new L.LatLng(bounds.getNorth(), bounds.getCenter().lng));

map
  .on('mousemove', updateTooltip)
  .on('editable:drawing:start', function(evt) {
    var text = getTooltipText(evt.layer);
    tooltip.setContent(text);
  })
  .on('editable:drawing:clicked', function(evt) {
    tooltip
      .setContent(getTooltipText(evt.layer, true))
      .updatePosition(evt.layerPoint);
  })
  .on('editable:drawing:end', function(evt) {
    tooltip.setContent('Start drawing to see tooltip change');
  });


function getTooltipText(layer, started) {
  if (layer instanceof L.Rectangle) {
    return 'Click and drag to draw the rectangle';
  } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
    if (started) {
      return 'Click last point to <span style="color: #B3E5FC">finish</span> drawing';
    } else {
      return 'Click on the map to start drawing';
    }
  } else if (layer instanceof L.Marker) {
    return 'Click on the map to put the marker';
  } else if (layer instanceof L.Circle) {
    return 'Click and drag to draw a circle';
  }
}

function updateTooltip(evt) {
  tooltip.updatePosition(evt.layerPoint);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../":2}],2:[function(require,module,exports){
require('./src/Tooltip');
module.exports = L.Tooltip;

},{"./src/Tooltip":3}],3:[function(require,module,exports){
L.Tooltip = L.Layer.extend({

  options: {
    pane: 'popupPane',
    nonBubblingEvents: ['mouseover', 'mousemove'],
    position: 'left',
    className: 'tooltip',
    arrowClass: 'tooltip-arrow',
    contentClass: 'tooltip-inner',
    subtextClass: 'tooltip-subtext',
    showClass: 'in',
    noWrap: false,
    wrapScreen: true,
    offset: [10, 5]
  },

  statics: {

    /**
     * @enum {String}
     */
    POSITIONS: {
      TOP:    'top',
      LEFT:   'left',
      BOTTOM: 'bottom',
      RIGHT:  'right'
    }
  },


  /**
   * @class L.Tooltip
   * @constructor
   * @param  {Object} options
   * @param  {*=}     source
   */
  initialize: function(options, source) {

    /**
     * @type {Element}
     */
    this._container   = null;


    /**
     * @type {Element}
     */
    this._arrow       = null;


    /**
     * @type {Element}
     */
    this._contentNode = null;


    /**
     * @type {Element}
     */
    this._subtext     = null;


    L.Util.setOptions(this, options);


    /**
     * @type {L.Layer}
     */
    this._source      = source;
  },


  /**
   * Creates elements
   */
  _initLayout: function() {
    var options = this.options;
    if (options.noWrap) {
      options.className += ' nowrap';
    }
    this._container   = L.DomUtil.create('div',
                          options.className + ' ' + options.position +
                          ' ' + options.showClass);
    this._arrow       = L.DomUtil.create('div',
                          options.arrowClass, this._container);
    this._contentNode = L.DomUtil.create('div',
                          options.contentClass, this._container);
    this._subtext     = L.DomUtil.create('div',
                          options.subtextClass, this._container);
  },


  /**
   * @param  {L.Map} map
   * @return {L.Tooltip}
   */
  onAdd: function(map) {
    this._map = map;
    this._initLayout();
    if (this.options.content) {
      this.setContent(this.options.content);
    }
    this.getPane().appendChild(this._container);
    return this;
  },


  /**
   * @return {L.Tooltip}
   */
  show: function() {
    L.DomUtil.addClass(this._container, this.options.showClass);
    return this;
  },


  /**
   * @return {L.Tooltip}
   */
  hide: function() {
    L.DomUtil.removeClass(this._container, this.options.showClass);
    return this;
  },


  /**
   * @param  {L.Map} map
   * @return {L.Tooltip}
   */
  onRemove: function(map) {
    L.Util.cancelAnimFrame(this._updateTimer);
    this.getPane().removeChild(this._container);
    this._map = null;
    return this;
  },


  /**
   * @param {String} content
   * @return {L.LatLng}
   */
  setContent: function(content) {
    this._contentNode.innerHTML = content;
    this.updatePosition();
    return this;
  },


  /**
   * @param {String} text
   * @return {L.Tooltip}
   */
  setSubtext: function(text) {
    this._subtext.innerHTML = text;
    this.updatePosition();
    return this;
  },


  /**
   * @param {L.LatLng} latlng
   * @return {L.Tooltip}
   */
  setLatLng: function(latlng) {
    this._latlng = latlng;
    this.updatePosition();
    return this;
  },


  /**
   * @param  {L.Point} point Position
   * @param  {String} position
   */
  _getOffset: function(point, position) {
    var container  = this._container;
    var options    = this.options;
    var width      = container.offsetWidth;
    var height     = container.offsetHeight;
    var POSITIONS  = L.Tooltip.POSITIONS;

    if (this.options.wrapScreen) {
      var mapSize = this._map.getSize();
      point = this._map.layerPointToContainerPoint(point);
      if (point.x + width / 2  > mapSize.x) {
        position = POSITIONS.LEFT;
      }
      if (point.x - width < 0) {
        position = POSITIONS.RIGHT;
      }

      if (point.y - height < 0) {
        position = POSITIONS.BOTTOM;
      }

      if (point.y + height > mapSize.y) {
        position = POSITIONS.TOP;
      }
    }

    this._container.className = (options.className + ' ' + position +
      ' ' + options.showClass);

    var offset = options.offset;
    if (position        === POSITIONS.LEFT) {
      return new L.Point(-width - offset[0], -height / 2)._floor();
    } else if (position === POSITIONS.RIGHT) {
      return new L.Point(0 + offset[0], -height / 2)._floor();
    } else if (position === POSITIONS.TOP) {
      return new L.Point(-width / 2, -height - offset[1])._floor();
    } else if (position === POSITIONS.BOTTOM) {
      return new L.Point(-width / 2, 0 + offset[1])._floor();
    }
  },


  /**
   * @param  {L.Point=} point
   */
  updatePosition: function(point) {
    this._updateTimer = L.Util.requestAnimFrame(function() {
      if (this._map) {
        point = point || this._map.latLngToLayerPoint(this._latlng);
        L.DomUtil.setPosition(this._container, point.add(
          this._getOffset(point, this.options.position)));
      }
    }, this);
  }

});

L.tooltip = function(options, source) {
  return new L.Tooltip(options, source);
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL2pzL2FwcC5qcyIsImluZGV4LmpzIiwic3JjL1Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdElBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgVG9vbHRpcCA9IHJlcXVpcmUoJy4uLy4uLycpO1xudmFyIE1BUEJPWF9UT0tFTiA9ICdway5leUoxSWpvaWR6aHlJaXdpWVNJNklsRjJObGg2UVZraWZRLkQ3QmttZW9NSTdHRWtNRHRnM2R1cncnO1xuXG5MLkljb24uRGVmYXVsdC5pbWFnZVBhdGggPSAnaHR0cDovL2Nkbi5sZWFmbGV0anMuY29tL2xlYWZsZXQtMS4wLjAtYjEvaW1hZ2VzJ1xuXG52YXIgbWFwID0gZ2xvYmFsLm1hcCA9IEwubWFwKCdtYXAnLCB7XG4gIGVkaXRhYmxlOiB0cnVlXG59KS5zZXRWaWV3KFszMS4yMzUyLCAxMjEuNDk0Ml0sIDE1KTtcbm1hcC5hZGRMYXllcihuZXcgTC5UaWxlTGF5ZXIoXG4gICdodHRwczovL2EudGlsZXMubWFwYm94LmNvbS92NC9tYXBib3guc3RyZWV0cy1iYXNpYy97en0ve3h9L3t5fS5wbmc/YWNjZXNzX3Rva2VuPScgKyBNQVBCT1hfVE9LRU4pXG4pO1xuXG5MLkVkaXRDb250cm9sID0gTC5Db250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBudWxsLFxuICAgIGtpbmQ6ICcnLFxuICAgIGh0bWw6ICcnXG4gIH0sXG5cbiAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICB2YXIgY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtY29udHJvbCBsZWFmbGV0LWJhcicpLFxuICAgICAgICBsaW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICcnLCBjb250YWluZXIpO1xuXG4gICAgbGluay5ocmVmID0gJyMnO1xuICAgIGxpbmsudGl0bGUgPSAnQ3JlYXRlIGEgbmV3ICcgKyB0aGlzLm9wdGlvbnMua2luZDtcbiAgICBsaW5rLmlubmVySFRNTCA9IHRoaXMub3B0aW9ucy5odG1sO1xuICAgIEwuRG9tRXZlbnRcbiAgICAgIC5vbihsaW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3ApXG4gICAgICAub24obGluaywgJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cuTEFZRVIgPSB0aGlzLm9wdGlvbnMuY2FsbGJhY2sobnVsbCwge30pO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfVxufSk7XG5cbkwuTmV3TGluZUNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0UG9seWxpbmUsIG1hcC5lZGl0VG9vbHMpLFxuICAgIGtpbmQ6ICdsaW5lJyxcbiAgICBodG1sOiAnXFxcXC9cXFxcJ1xuICB9XG59KTtcblxuTC5OZXdQb2x5Z29uQ29udHJvbCA9IEwuRWRpdENvbnRyb2wuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIHBvc2l0aW9uOiAndG9wbGVmdCcsXG4gICAgY2FsbGJhY2s6IEwuVXRpbC5iaW5kKG1hcC5lZGl0VG9vbHMuc3RhcnRQb2x5Z29uLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAncG9seWdvbicsXG4gICAgaHRtbDogJ+KWsCdcbiAgfVxufSk7XG5cbkwuTmV3TWFya2VyQ29udHJvbCA9IEwuRWRpdENvbnRyb2wuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIHBvc2l0aW9uOiAndG9wbGVmdCcsXG4gICAgY2FsbGJhY2s6IEwuVXRpbC5iaW5kKG1hcC5lZGl0VG9vbHMuc3RhcnRNYXJrZXIsIG1hcC5lZGl0VG9vbHMpLFxuICAgIGtpbmQ6ICdtYXJrZXInLFxuICAgIGh0bWw6ICfwn5aIJ1xuICB9XG59KTtcblxuTC5OZXdSZWN0YW5nbGVDb250cm9sID0gTC5FZGl0Q29udHJvbC5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgcG9zaXRpb246ICd0b3BsZWZ0JyxcbiAgICBjYWxsYmFjazogTC5VdGlsLmJpbmQobWFwLmVkaXRUb29scy5zdGFydFJlY3RhbmdsZSwgbWFwLmVkaXRUb29scyksXG4gICAga2luZDogJ3JlY3RhbmdsZScsXG4gICAgZHJhZ2dhYmxlOiB0cnVlLFxuICAgIGh0bWw6ICfirJsnXG4gIH1cbn0pO1xuXG5MLk5ld0NpcmNsZUNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0Q2lyY2xlLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAnY2lyY2xlJyxcbiAgICBodG1sOiAn4qykJ1xuICB9XG59KTtcblxuW1xuICBuZXcgTC5OZXdNYXJrZXJDb250cm9sKCksXG4gIG5ldyBMLk5ld0xpbmVDb250cm9sKCksIG5ldyBMLk5ld1BvbHlnb25Db250cm9sKCksXG4gIG5ldyBMLk5ld1JlY3RhbmdsZUNvbnRyb2woKSwgbmV3IEwuTmV3Q2lyY2xlQ29udHJvbCgpXG5dLmZvckVhY2gobWFwLmFkZENvbnRyb2wsIG1hcCk7XG5cblxudmFyIGJvdW5kcyA9IG1hcC5nZXRCb3VuZHMoKS5wYWQoMC4yNSk7IC8vIHNsaWdodGx5IG91dCBvZiBzY3JlZW5cbnZhciB0b29sdGlwID0gTC50b29sdGlwKHtcbiAgcG9zaXRpb246ICdsZWZ0JyxcbiAgbm9XcmFwOiB0cnVlXG59KVxuICAuYWRkVG8obWFwKVxuICAuc2V0Q29udGVudCgnU3RhcnQgZHJhd2luZyB0byBzZWUgdG9vbHRpcCBjaGFuZ2UnKVxuICAuc2V0TGF0TG5nKG5ldyBMLkxhdExuZyhib3VuZHMuZ2V0Tm9ydGgoKSwgYm91bmRzLmdldENlbnRlcigpLmxuZykpO1xuXG5tYXBcbiAgLm9uKCdtb3VzZW1vdmUnLCB1cGRhdGVUb29sdGlwKVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6c3RhcnQnLCBmdW5jdGlvbihldnQpIHtcbiAgICB2YXIgdGV4dCA9IGdldFRvb2x0aXBUZXh0KGV2dC5sYXllcik7XG4gICAgdG9vbHRpcC5zZXRDb250ZW50KHRleHQpO1xuICB9KVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6Y2xpY2tlZCcsIGZ1bmN0aW9uKGV2dCkge1xuICAgIHRvb2x0aXBcbiAgICAgIC5zZXRDb250ZW50KGdldFRvb2x0aXBUZXh0KGV2dC5sYXllciwgdHJ1ZSkpXG4gICAgICAudXBkYXRlUG9zaXRpb24oZXZ0LmxheWVyUG9pbnQpO1xuICB9KVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6ZW5kJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgdG9vbHRpcC5zZXRDb250ZW50KCdTdGFydCBkcmF3aW5nIHRvIHNlZSB0b29sdGlwIGNoYW5nZScpO1xuICB9KTtcblxuXG5mdW5jdGlvbiBnZXRUb29sdGlwVGV4dChsYXllciwgc3RhcnRlZCkge1xuICBpZiAobGF5ZXIgaW5zdGFuY2VvZiBMLlJlY3RhbmdsZSkge1xuICAgIHJldHVybiAnQ2xpY2sgYW5kIGRyYWcgdG8gZHJhdyB0aGUgcmVjdGFuZ2xlJztcbiAgfSBlbHNlIGlmIChsYXllciBpbnN0YW5jZW9mIEwuUG9seWdvbiB8fCBsYXllciBpbnN0YW5jZW9mIEwuUG9seWxpbmUpIHtcbiAgICBpZiAoc3RhcnRlZCkge1xuICAgICAgcmV0dXJuICdDbGljayBsYXN0IHBvaW50IHRvIDxzcGFuIHN0eWxlPVwiY29sb3I6ICNCM0U1RkNcIj5maW5pc2g8L3NwYW4+IGRyYXdpbmcnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ0NsaWNrIG9uIHRoZSBtYXAgdG8gc3RhcnQgZHJhd2luZyc7XG4gICAgfVxuICB9IGVsc2UgaWYgKGxheWVyIGluc3RhbmNlb2YgTC5NYXJrZXIpIHtcbiAgICByZXR1cm4gJ0NsaWNrIG9uIHRoZSBtYXAgdG8gcHV0IHRoZSBtYXJrZXInO1xuICB9IGVsc2UgaWYgKGxheWVyIGluc3RhbmNlb2YgTC5DaXJjbGUpIHtcbiAgICByZXR1cm4gJ0NsaWNrIGFuZCBkcmFnIHRvIGRyYXcgYSBjaXJjbGUnO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRvb2x0aXAoZXZ0KSB7XG4gIHRvb2x0aXAudXBkYXRlUG9zaXRpb24oZXZ0LmxheWVyUG9pbnQpO1xufVxuIiwicmVxdWlyZSgnLi9zcmMvVG9vbHRpcCcpO1xubW9kdWxlLmV4cG9ydHMgPSBMLlRvb2x0aXA7XG4iLCJMLlRvb2x0aXAgPSBMLkxheWVyLmV4dGVuZCh7XG5cbiAgb3B0aW9uczoge1xuICAgIHBhbmU6ICdwb3B1cFBhbmUnLFxuICAgIG5vbkJ1YmJsaW5nRXZlbnRzOiBbJ21vdXNlb3ZlcicsICdtb3VzZW1vdmUnXSxcbiAgICBwb3NpdGlvbjogJ2xlZnQnLFxuICAgIGNsYXNzTmFtZTogJ3Rvb2x0aXAnLFxuICAgIGFycm93Q2xhc3M6ICd0b29sdGlwLWFycm93JyxcbiAgICBjb250ZW50Q2xhc3M6ICd0b29sdGlwLWlubmVyJyxcbiAgICBzdWJ0ZXh0Q2xhc3M6ICd0b29sdGlwLXN1YnRleHQnLFxuICAgIHNob3dDbGFzczogJ2luJyxcbiAgICBub1dyYXA6IGZhbHNlLFxuICAgIHdyYXBTY3JlZW46IHRydWUsXG4gICAgb2Zmc2V0OiBbMTAsIDVdXG4gIH0sXG5cbiAgc3RhdGljczoge1xuXG4gICAgLyoqXG4gICAgICogQGVudW0ge1N0cmluZ31cbiAgICAgKi9cbiAgICBQT1NJVElPTlM6IHtcbiAgICAgIFRPUDogICAgJ3RvcCcsXG4gICAgICBMRUZUOiAgICdsZWZ0JyxcbiAgICAgIEJPVFRPTTogJ2JvdHRvbScsXG4gICAgICBSSUdIVDogICdyaWdodCdcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogQGNsYXNzIEwuVG9vbHRpcFxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEBwYXJhbSAgeyo9fSAgICAgc291cmNlXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zLCBzb3VyY2UpIHtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqL1xuICAgIHRoaXMuX2NvbnRhaW5lciAgID0gbnVsbDtcblxuXG4gICAgLyoqXG4gICAgICogQHR5cGUge0VsZW1lbnR9XG4gICAgICovXG4gICAgdGhpcy5fYXJyb3cgICAgICAgPSBudWxsO1xuXG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKi9cbiAgICB0aGlzLl9jb250ZW50Tm9kZSA9IG51bGw7XG5cblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqL1xuICAgIHRoaXMuX3N1YnRleHQgICAgID0gbnVsbDtcblxuXG4gICAgTC5VdGlsLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtMLkxheWVyfVxuICAgICAqL1xuICAgIHRoaXMuX3NvdXJjZSAgICAgID0gc291cmNlO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgZWxlbWVudHNcbiAgICovXG4gIF9pbml0TGF5b3V0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICBpZiAob3B0aW9ucy5ub1dyYXApIHtcbiAgICAgIG9wdGlvbnMuY2xhc3NOYW1lICs9ICcgbm93cmFwJztcbiAgICB9XG4gICAgdGhpcy5fY29udGFpbmVyICAgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmNsYXNzTmFtZSArICcgJyArIG9wdGlvbnMucG9zaXRpb24gK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnICcgKyBvcHRpb25zLnNob3dDbGFzcyk7XG4gICAgdGhpcy5fYXJyb3cgICAgICAgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmFycm93Q2xhc3MsIHRoaXMuX2NvbnRhaW5lcik7XG4gICAgdGhpcy5fY29udGVudE5vZGUgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmNvbnRlbnRDbGFzcywgdGhpcy5fY29udGFpbmVyKTtcbiAgICB0aGlzLl9zdWJ0ZXh0ICAgICA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VidGV4dENsYXNzLCB0aGlzLl9jb250YWluZXIpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuTWFwfSBtYXBcbiAgICogQHJldHVybiB7TC5Ub29sdGlwfVxuICAgKi9cbiAgb25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuICAgIHRoaXMuX21hcCA9IG1hcDtcbiAgICB0aGlzLl9pbml0TGF5b3V0KCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50KSB7XG4gICAgICB0aGlzLnNldENvbnRlbnQodGhpcy5vcHRpb25zLmNvbnRlbnQpO1xuICAgIH1cbiAgICB0aGlzLmdldFBhbmUoKS5hcHBlbmRDaGlsZCh0aGlzLl9jb250YWluZXIpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgIEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9jb250YWluZXIsIHRoaXMub3B0aW9ucy5zaG93Q2xhc3MpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgIEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl9jb250YWluZXIsIHRoaXMub3B0aW9ucy5zaG93Q2xhc3MpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuTWFwfSBtYXBcbiAgICogQHJldHVybiB7TC5Ub29sdGlwfVxuICAgKi9cbiAgb25SZW1vdmU6IGZ1bmN0aW9uKG1hcCkge1xuICAgIEwuVXRpbC5jYW5jZWxBbmltRnJhbWUodGhpcy5fdXBkYXRlVGltZXIpO1xuICAgIHRoaXMuZ2V0UGFuZSgpLnJlbW92ZUNoaWxkKHRoaXMuX2NvbnRhaW5lcik7XG4gICAgdGhpcy5fbWFwID0gbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFxuICAgKiBAcmV0dXJuIHtMLkxhdExuZ31cbiAgICovXG4gIHNldENvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB0aGlzLl9jb250ZW50Tm9kZS5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBzZXRTdWJ0ZXh0OiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fc3VidGV4dC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge0wuTGF0TG5nfSBsYXRsbmdcbiAgICogQHJldHVybiB7TC5Ub29sdGlwfVxuICAgKi9cbiAgc2V0TGF0TG5nOiBmdW5jdGlvbihsYXRsbmcpIHtcbiAgICB0aGlzLl9sYXRsbmcgPSBsYXRsbmc7XG4gICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuUG9pbnR9IHBvaW50IFBvc2l0aW9uXG4gICAqIEBwYXJhbSAge1N0cmluZ30gcG9zaXRpb25cbiAgICovXG4gIF9nZXRPZmZzZXQ6IGZ1bmN0aW9uKHBvaW50LCBwb3NpdGlvbikge1xuICAgIHZhciBjb250YWluZXIgID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHZhciBvcHRpb25zICAgID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciB3aWR0aCAgICAgID0gY29udGFpbmVyLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgICAgID0gY29udGFpbmVyLm9mZnNldEhlaWdodDtcbiAgICB2YXIgUE9TSVRJT05TICA9IEwuVG9vbHRpcC5QT1NJVElPTlM7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLndyYXBTY3JlZW4pIHtcbiAgICAgIHZhciBtYXBTaXplID0gdGhpcy5fbWFwLmdldFNpemUoKTtcbiAgICAgIHBvaW50ID0gdGhpcy5fbWFwLmxheWVyUG9pbnRUb0NvbnRhaW5lclBvaW50KHBvaW50KTtcbiAgICAgIGlmIChwb2ludC54ICsgd2lkdGggLyAyICA+IG1hcFNpemUueCkge1xuICAgICAgICBwb3NpdGlvbiA9IFBPU0lUSU9OUy5MRUZUO1xuICAgICAgfVxuICAgICAgaWYgKHBvaW50LnggLSB3aWR0aCA8IDApIHtcbiAgICAgICAgcG9zaXRpb24gPSBQT1NJVElPTlMuUklHSFQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb2ludC55IC0gaGVpZ2h0IDwgMCkge1xuICAgICAgICBwb3NpdGlvbiA9IFBPU0lUSU9OUy5CT1RUT007XG4gICAgICB9XG5cbiAgICAgIGlmIChwb2ludC55ICsgaGVpZ2h0ID4gbWFwU2l6ZS55KSB7XG4gICAgICAgIHBvc2l0aW9uID0gUE9TSVRJT05TLlRPUDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9jb250YWluZXIuY2xhc3NOYW1lID0gKG9wdGlvbnMuY2xhc3NOYW1lICsgJyAnICsgcG9zaXRpb24gK1xuICAgICAgJyAnICsgb3B0aW9ucy5zaG93Q2xhc3MpO1xuXG4gICAgdmFyIG9mZnNldCA9IG9wdGlvbnMub2Zmc2V0O1xuICAgIGlmIChwb3NpdGlvbiAgICAgICAgPT09IFBPU0lUSU9OUy5MRUZUKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoLXdpZHRoIC0gb2Zmc2V0WzBdLCAtaGVpZ2h0IC8gMikuX2Zsb29yKCk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gUE9TSVRJT05TLlJJR0hUKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoMCArIG9mZnNldFswXSwgLWhlaWdodCAvIDIpLl9mbG9vcigpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09IFBPU0lUSU9OUy5UT1ApIHtcbiAgICAgIHJldHVybiBuZXcgTC5Qb2ludCgtd2lkdGggLyAyLCAtaGVpZ2h0IC0gb2Zmc2V0WzFdKS5fZmxvb3IoKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBQT1NJVElPTlMuQk9UVE9NKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoLXdpZHRoIC8gMiwgMCArIG9mZnNldFsxXSkuX2Zsb29yKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuUG9pbnQ9fSBwb2ludFxuICAgKi9cbiAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgdGhpcy5fdXBkYXRlVGltZXIgPSBMLlV0aWwucmVxdWVzdEFuaW1GcmFtZShmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLl9tYXApIHtcbiAgICAgICAgcG9pbnQgPSBwb2ludCB8fCB0aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KHRoaXMuX2xhdGxuZyk7XG4gICAgICAgIEwuRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9jb250YWluZXIsIHBvaW50LmFkZChcbiAgICAgICAgICB0aGlzLl9nZXRPZmZzZXQocG9pbnQsIHRoaXMub3B0aW9ucy5wb3NpdGlvbikpKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfVxuXG59KTtcblxuTC50b29sdGlwID0gZnVuY3Rpb24ob3B0aW9ucywgc291cmNlKSB7XG4gIHJldHVybiBuZXcgTC5Ub29sdGlwKG9wdGlvbnMsIHNvdXJjZSk7XG59O1xuIl19
