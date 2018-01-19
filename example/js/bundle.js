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
    this._map.on('zoomend', this.updatePosition);
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
    this._map.off('zoomend', this.updatePosition);
    this._map = null;
    return this;
  },


  /**
   * @param {String} content
   * @return {L.LatLng}
   */
  setContent: function(content) {
    this.options.content = content;
    if (this._map) {
      this._contentNode.innerHTML = content;
      this.updatePosition();
    }
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

    var className = options.className + ' ' + position;
    if (L.DomUtil.hasClass(this._container, this.options.showClass)) {
      className = className + ' ' + options.showClass;
    }
    this._container.className = className;

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
        if (!point) {
            point = this._map.latLngToLayerPoint(this._latlng);
        }
        else {
            // new position defined, do not forget to update the _latlng
            this._latlng = this._map.layerPointToLatLng(point);
        }
        L.DomUtil.setPosition(this._container, point.add(
          this._getOffset(point, this.options.position))._floor());
      }
    }, this);
  }

});

L.tooltip = function(options, source) {
  return new L.Tooltip(options, source);
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL2pzL2FwcC5qcyIsImluZGV4LmpzIiwic3JjL1Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdElBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFRvb2x0aXAgPSByZXF1aXJlKCcuLi8uLi8nKTtcbnZhciBNQVBCT1hfVE9LRU4gPSAncGsuZXlKMUlqb2lkemh5SWl3aVlTSTZJbEYyTmxoNlFWa2lmUS5EN0JrbWVvTUk3R0VrTUR0ZzNkdXJ3JztcblxuTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoID0gJ2h0dHA6Ly9jZG4ubGVhZmxldGpzLmNvbS9sZWFmbGV0LTEuMC4wLWIxL2ltYWdlcydcblxudmFyIG1hcCA9IGdsb2JhbC5tYXAgPSBMLm1hcCgnbWFwJywge1xuICBlZGl0YWJsZTogdHJ1ZVxufSkuc2V0VmlldyhbMzEuMjM1MiwgMTIxLjQ5NDJdLCAxNSk7XG5tYXAuYWRkTGF5ZXIobmV3IEwuVGlsZUxheWVyKFxuICAnaHR0cHM6Ly9hLnRpbGVzLm1hcGJveC5jb20vdjQvbWFwYm94LnN0cmVldHMtYmFzaWMve3p9L3t4fS97eX0ucG5nP2FjY2Vzc190b2tlbj0nICsgTUFQQk9YX1RPS0VOKVxuKTtcblxuTC5FZGl0Q29udHJvbCA9IEwuQ29udHJvbC5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgcG9zaXRpb246ICd0b3BsZWZ0JyxcbiAgICBjYWxsYmFjazogbnVsbCxcbiAgICBraW5kOiAnJyxcbiAgICBodG1sOiAnJ1xuICB9LFxuXG4gIG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgdmFyIGNvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LWNvbnRyb2wgbGVhZmxldC1iYXInKSxcbiAgICAgICAgbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnJywgY29udGFpbmVyKTtcblxuICAgIGxpbmsuaHJlZiA9ICcjJztcbiAgICBsaW5rLnRpdGxlID0gJ0NyZWF0ZSBhIG5ldyAnICsgdGhpcy5vcHRpb25zLmtpbmQ7XG4gICAgbGluay5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMuaHRtbDtcbiAgICBMLkRvbUV2ZW50XG4gICAgICAub24obGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wKVxuICAgICAgLm9uKGxpbmssICdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LkxBWUVSID0gdGhpcy5vcHRpb25zLmNhbGxiYWNrKG51bGwsIHt9KTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH1cbn0pO1xuXG5MLk5ld0xpbmVDb250cm9sID0gTC5FZGl0Q29udHJvbC5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgcG9zaXRpb246ICd0b3BsZWZ0JyxcbiAgICBjYWxsYmFjazogTC5VdGlsLmJpbmQobWFwLmVkaXRUb29scy5zdGFydFBvbHlsaW5lLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAnbGluZScsXG4gICAgaHRtbDogJ1xcXFwvXFxcXCdcbiAgfVxufSk7XG5cbkwuTmV3UG9seWdvbkNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0UG9seWdvbiwgbWFwLmVkaXRUb29scyksXG4gICAga2luZDogJ3BvbHlnb24nLFxuICAgIGh0bWw6ICfilrAnXG4gIH1cbn0pO1xuXG5MLk5ld01hcmtlckNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0TWFya2VyLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAnbWFya2VyJyxcbiAgICBodG1sOiAn8J+WiCdcbiAgfVxufSk7XG5cbkwuTmV3UmVjdGFuZ2xlQ29udHJvbCA9IEwuRWRpdENvbnRyb2wuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIHBvc2l0aW9uOiAndG9wbGVmdCcsXG4gICAgY2FsbGJhY2s6IEwuVXRpbC5iaW5kKG1hcC5lZGl0VG9vbHMuc3RhcnRSZWN0YW5nbGUsIG1hcC5lZGl0VG9vbHMpLFxuICAgIGtpbmQ6ICdyZWN0YW5nbGUnLFxuICAgIGRyYWdnYWJsZTogdHJ1ZSxcbiAgICBodG1sOiAn4qybJ1xuICB9XG59KTtcblxuTC5OZXdDaXJjbGVDb250cm9sID0gTC5FZGl0Q29udHJvbC5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgcG9zaXRpb246ICd0b3BsZWZ0JyxcbiAgICBjYWxsYmFjazogTC5VdGlsLmJpbmQobWFwLmVkaXRUb29scy5zdGFydENpcmNsZSwgbWFwLmVkaXRUb29scyksXG4gICAga2luZDogJ2NpcmNsZScsXG4gICAgaHRtbDogJ+KspCdcbiAgfVxufSk7XG5cbltcbiAgbmV3IEwuTmV3TWFya2VyQ29udHJvbCgpLFxuICBuZXcgTC5OZXdMaW5lQ29udHJvbCgpLCBuZXcgTC5OZXdQb2x5Z29uQ29udHJvbCgpLFxuICBuZXcgTC5OZXdSZWN0YW5nbGVDb250cm9sKCksIG5ldyBMLk5ld0NpcmNsZUNvbnRyb2woKVxuXS5mb3JFYWNoKG1hcC5hZGRDb250cm9sLCBtYXApO1xuXG5cbnZhciBib3VuZHMgPSBtYXAuZ2V0Qm91bmRzKCkucGFkKDAuMjUpOyAvLyBzbGlnaHRseSBvdXQgb2Ygc2NyZWVuXG52YXIgdG9vbHRpcCA9IEwudG9vbHRpcCh7XG4gIHBvc2l0aW9uOiAnbGVmdCcsXG4gIG5vV3JhcDogdHJ1ZVxufSlcbiAgLmFkZFRvKG1hcClcbiAgLnNldENvbnRlbnQoJ1N0YXJ0IGRyYXdpbmcgdG8gc2VlIHRvb2x0aXAgY2hhbmdlJylcbiAgLnNldExhdExuZyhuZXcgTC5MYXRMbmcoYm91bmRzLmdldE5vcnRoKCksIGJvdW5kcy5nZXRDZW50ZXIoKS5sbmcpKTtcblxubWFwXG4gIC5vbignbW91c2Vtb3ZlJywgdXBkYXRlVG9vbHRpcClcbiAgLm9uKCdlZGl0YWJsZTpkcmF3aW5nOnN0YXJ0JywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgdmFyIHRleHQgPSBnZXRUb29sdGlwVGV4dChldnQubGF5ZXIpO1xuICAgIHRvb2x0aXAuc2V0Q29udGVudCh0ZXh0KTtcbiAgfSlcbiAgLm9uKCdlZGl0YWJsZTpkcmF3aW5nOmNsaWNrZWQnLCBmdW5jdGlvbihldnQpIHtcbiAgICB0b29sdGlwXG4gICAgICAuc2V0Q29udGVudChnZXRUb29sdGlwVGV4dChldnQubGF5ZXIsIHRydWUpKVxuICAgICAgLnVwZGF0ZVBvc2l0aW9uKGV2dC5sYXllclBvaW50KTtcbiAgfSlcbiAgLm9uKCdlZGl0YWJsZTpkcmF3aW5nOmVuZCcsIGZ1bmN0aW9uKGV2dCkge1xuICAgIHRvb2x0aXAuc2V0Q29udGVudCgnU3RhcnQgZHJhd2luZyB0byBzZWUgdG9vbHRpcCBjaGFuZ2UnKTtcbiAgfSk7XG5cblxuZnVuY3Rpb24gZ2V0VG9vbHRpcFRleHQobGF5ZXIsIHN0YXJ0ZWQpIHtcbiAgaWYgKGxheWVyIGluc3RhbmNlb2YgTC5SZWN0YW5nbGUpIHtcbiAgICByZXR1cm4gJ0NsaWNrIGFuZCBkcmFnIHRvIGRyYXcgdGhlIHJlY3RhbmdsZSc7XG4gIH0gZWxzZSBpZiAobGF5ZXIgaW5zdGFuY2VvZiBMLlBvbHlnb24gfHwgbGF5ZXIgaW5zdGFuY2VvZiBMLlBvbHlsaW5lKSB7XG4gICAgaWYgKHN0YXJ0ZWQpIHtcbiAgICAgIHJldHVybiAnQ2xpY2sgbGFzdCBwb2ludCB0byA8c3BhbiBzdHlsZT1cImNvbG9yOiAjQjNFNUZDXCI+ZmluaXNoPC9zcGFuPiBkcmF3aW5nJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdDbGljayBvbiB0aGUgbWFwIHRvIHN0YXJ0IGRyYXdpbmcnO1xuICAgIH1cbiAgfSBlbHNlIGlmIChsYXllciBpbnN0YW5jZW9mIEwuTWFya2VyKSB7XG4gICAgcmV0dXJuICdDbGljayBvbiB0aGUgbWFwIHRvIHB1dCB0aGUgbWFya2VyJztcbiAgfSBlbHNlIGlmIChsYXllciBpbnN0YW5jZW9mIEwuQ2lyY2xlKSB7XG4gICAgcmV0dXJuICdDbGljayBhbmQgZHJhZyB0byBkcmF3IGEgY2lyY2xlJztcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVUb29sdGlwKGV2dCkge1xuICB0b29sdGlwLnVwZGF0ZVBvc2l0aW9uKGV2dC5sYXllclBvaW50KTtcbn1cbiIsInJlcXVpcmUoJy4vc3JjL1Rvb2x0aXAnKTtcbm1vZHVsZS5leHBvcnRzID0gTC5Ub29sdGlwO1xuIiwiTC5Ub29sdGlwID0gTC5MYXllci5leHRlbmQoe1xuXG4gIG9wdGlvbnM6IHtcbiAgICBwYW5lOiAncG9wdXBQYW5lJyxcbiAgICBub25CdWJibGluZ0V2ZW50czogWydtb3VzZW92ZXInLCAnbW91c2Vtb3ZlJ10sXG4gICAgcG9zaXRpb246ICdsZWZ0JyxcbiAgICBjbGFzc05hbWU6ICd0b29sdGlwJyxcbiAgICBhcnJvd0NsYXNzOiAndG9vbHRpcC1hcnJvdycsXG4gICAgY29udGVudENsYXNzOiAndG9vbHRpcC1pbm5lcicsXG4gICAgc3VidGV4dENsYXNzOiAndG9vbHRpcC1zdWJ0ZXh0JyxcbiAgICBzaG93Q2xhc3M6ICdpbicsXG4gICAgbm9XcmFwOiBmYWxzZSxcbiAgICB3cmFwU2NyZWVuOiB0cnVlLFxuICAgIG9mZnNldDogWzEwLCA1XVxuICB9LFxuXG4gIHN0YXRpY3M6IHtcblxuICAgIC8qKlxuICAgICAqIEBlbnVtIHtTdHJpbmd9XG4gICAgICovXG4gICAgUE9TSVRJT05TOiB7XG4gICAgICBUT1A6ICAgICd0b3AnLFxuICAgICAgTEVGVDogICAnbGVmdCcsXG4gICAgICBCT1RUT006ICdib3R0b20nLFxuICAgICAgUklHSFQ6ICAncmlnaHQnXG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBjbGFzcyBMLlRvb2x0aXBcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0gIHsqPX0gICAgIHNvdXJjZVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucywgc291cmNlKSB7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKi9cbiAgICB0aGlzLl9jb250YWluZXIgICA9IG51bGw7XG5cblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqL1xuICAgIHRoaXMuX2Fycm93ICAgICAgID0gbnVsbDtcblxuXG4gICAgLyoqXG4gICAgICogQHR5cGUge0VsZW1lbnR9XG4gICAgICovXG4gICAgdGhpcy5fY29udGVudE5vZGUgPSBudWxsO1xuXG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKi9cbiAgICB0aGlzLl9zdWJ0ZXh0ICAgICA9IG51bGw7XG5cblxuICAgIEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7TC5MYXllcn1cbiAgICAgKi9cbiAgICB0aGlzLl9zb3VyY2UgICAgICA9IHNvdXJjZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGVsZW1lbnRzXG4gICAqL1xuICBfaW5pdExheW91dDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgaWYgKG9wdGlvbnMubm9XcmFwKSB7XG4gICAgICBvcHRpb25zLmNsYXNzTmFtZSArPSAnIG5vd3JhcCc7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lciAgID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5jbGFzc05hbWUgKyAnICcgKyBvcHRpb25zLnBvc2l0aW9uICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJyAnICsgb3B0aW9ucy5zaG93Q2xhc3MpO1xuICAgIHRoaXMuX2Fycm93ICAgICAgID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5hcnJvd0NsYXNzLCB0aGlzLl9jb250YWluZXIpO1xuICAgIHRoaXMuX2NvbnRlbnROb2RlID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5jb250ZW50Q2xhc3MsIHRoaXMuX2NvbnRhaW5lcik7XG4gICAgdGhpcy5fc3VidGV4dCAgICAgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnN1YnRleHRDbGFzcywgdGhpcy5fY29udGFpbmVyKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLk1hcH0gbWFwXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIG9uQWRkOiBmdW5jdGlvbihtYXApIHtcbiAgICB0aGlzLl9tYXAgPSBtYXA7XG4gICAgdGhpcy5faW5pdExheW91dCgpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudCkge1xuICAgICAgdGhpcy5zZXRDb250ZW50KHRoaXMub3B0aW9ucy5jb250ZW50KTtcbiAgICB9XG4gICAgdGhpcy5nZXRQYW5lKCkuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKTtcbiAgICB0aGlzLl9tYXAub24oJ3pvb21lbmQnLCB0aGlzLnVwZGF0ZVBvc2l0aW9uKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICBMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICBMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fY29udGFpbmVyLCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLk1hcH0gbWFwXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIG9uUmVtb3ZlOiBmdW5jdGlvbihtYXApIHtcbiAgICBMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX3VwZGF0ZVRpbWVyKTtcbiAgICB0aGlzLmdldFBhbmUoKS5yZW1vdmVDaGlsZCh0aGlzLl9jb250YWluZXIpO1xuICAgIHRoaXMuX21hcC5vZmYoJ3pvb21lbmQnLCB0aGlzLnVwZGF0ZVBvc2l0aW9uKTtcbiAgICB0aGlzLl9tYXAgPSBudWxsO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZW50XG4gICAqIEByZXR1cm4ge0wuTGF0TG5nfVxuICAgKi9cbiAgc2V0Q29udGVudDogZnVuY3Rpb24oY29udGVudCkge1xuICAgIHRoaXMub3B0aW9ucy5jb250ZW50ID0gY29udGVudDtcbiAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICB0aGlzLl9jb250ZW50Tm9kZS5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBzZXRTdWJ0ZXh0OiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fc3VidGV4dC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge0wuTGF0TG5nfSBsYXRsbmdcbiAgICogQHJldHVybiB7TC5Ub29sdGlwfVxuICAgKi9cbiAgc2V0TGF0TG5nOiBmdW5jdGlvbihsYXRsbmcpIHtcbiAgICB0aGlzLl9sYXRsbmcgPSBsYXRsbmc7XG4gICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuUG9pbnR9IHBvaW50IFBvc2l0aW9uXG4gICAqIEBwYXJhbSAge1N0cmluZ30gcG9zaXRpb25cbiAgICovXG4gIF9nZXRPZmZzZXQ6IGZ1bmN0aW9uKHBvaW50LCBwb3NpdGlvbikge1xuICAgIHZhciBjb250YWluZXIgID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHZhciBvcHRpb25zICAgID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciB3aWR0aCAgICAgID0gY29udGFpbmVyLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgICAgID0gY29udGFpbmVyLm9mZnNldEhlaWdodDtcbiAgICB2YXIgUE9TSVRJT05TICA9IEwuVG9vbHRpcC5QT1NJVElPTlM7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLndyYXBTY3JlZW4pIHtcbiAgICAgIHZhciBtYXBTaXplID0gdGhpcy5fbWFwLmdldFNpemUoKTtcbiAgICAgIHBvaW50ID0gdGhpcy5fbWFwLmxheWVyUG9pbnRUb0NvbnRhaW5lclBvaW50KHBvaW50KTtcbiAgICAgIGlmIChwb2ludC54ICsgd2lkdGggLyAyICA+IG1hcFNpemUueCkge1xuICAgICAgICBwb3NpdGlvbiA9IFBPU0lUSU9OUy5MRUZUO1xuICAgICAgfVxuICAgICAgaWYgKHBvaW50LnggLSB3aWR0aCA8IDApIHtcbiAgICAgICAgcG9zaXRpb24gPSBQT1NJVElPTlMuUklHSFQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwb2ludC55IC0gaGVpZ2h0IDwgMCkge1xuICAgICAgICBwb3NpdGlvbiA9IFBPU0lUSU9OUy5CT1RUT007XG4gICAgICB9XG5cbiAgICAgIGlmIChwb2ludC55ICsgaGVpZ2h0ID4gbWFwU2l6ZS55KSB7XG4gICAgICAgIHBvc2l0aW9uID0gUE9TSVRJT05TLlRPUDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY2xhc3NOYW1lID0gb3B0aW9ucy5jbGFzc05hbWUgKyAnICcgKyBwb3NpdGlvbjtcbiAgICBpZiAoTC5Eb21VdGlsLmhhc0NsYXNzKHRoaXMuX2NvbnRhaW5lciwgdGhpcy5vcHRpb25zLnNob3dDbGFzcykpIHtcbiAgICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSArICcgJyArIG9wdGlvbnMuc2hvd0NsYXNzO1xuICAgIH1cbiAgICB0aGlzLl9jb250YWluZXIuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuXG4gICAgdmFyIG9mZnNldCA9IG9wdGlvbnMub2Zmc2V0O1xuICAgIGlmIChwb3NpdGlvbiAgICAgICAgPT09IFBPU0lUSU9OUy5MRUZUKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoLXdpZHRoIC0gb2Zmc2V0WzBdLCAtaGVpZ2h0IC8gMikuX2Zsb29yKCk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gUE9TSVRJT05TLlJJR0hUKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoMCArIG9mZnNldFswXSwgLWhlaWdodCAvIDIpLl9mbG9vcigpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09IFBPU0lUSU9OUy5UT1ApIHtcbiAgICAgIHJldHVybiBuZXcgTC5Qb2ludCgtd2lkdGggLyAyLCAtaGVpZ2h0IC0gb2Zmc2V0WzFdKS5fZmxvb3IoKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBQT1NJVElPTlMuQk9UVE9NKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoLXdpZHRoIC8gMiwgMCArIG9mZnNldFsxXSkuX2Zsb29yKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSAge0wuUG9pbnQ9fSBwb2ludFxuICAgKi9cbiAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgdGhpcy5fdXBkYXRlVGltZXIgPSBMLlV0aWwucmVxdWVzdEFuaW1GcmFtZShmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLl9tYXApIHtcbiAgICAgICAgaWYgKCFwb2ludCkge1xuICAgICAgICAgICAgcG9pbnQgPSB0aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KHRoaXMuX2xhdGxuZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBuZXcgcG9zaXRpb24gZGVmaW5lZCwgZG8gbm90IGZvcmdldCB0byB1cGRhdGUgdGhlIF9sYXRsbmdcbiAgICAgICAgICAgIHRoaXMuX2xhdGxuZyA9IHRoaXMuX21hcC5sYXllclBvaW50VG9MYXRMbmcocG9pbnQpO1xuICAgICAgICB9XG4gICAgICAgIEwuRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9jb250YWluZXIsIHBvaW50LmFkZChcbiAgICAgICAgICB0aGlzLl9nZXRPZmZzZXQocG9pbnQsIHRoaXMub3B0aW9ucy5wb3NpdGlvbikpLl9mbG9vcigpKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfVxuXG59KTtcblxuTC50b29sdGlwID0gZnVuY3Rpb24ob3B0aW9ucywgc291cmNlKSB7XG4gIHJldHVybiBuZXcgTC5Ub29sdGlwKG9wdGlvbnMsIHNvdXJjZSk7XG59O1xuIl19
