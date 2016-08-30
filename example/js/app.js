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
