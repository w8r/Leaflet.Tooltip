# Leaflet.Tooltip [![npm version](https://badge.fury.io/js/leaflet-tooltip.svg)](https://badge.fury.io/js/leaflet-tooltip)

![Screenshot](https://cloud.githubusercontent.com/assets/26884/14630775/04523c10-0610-11e6-8c40-1938b021d166.png)

Movable tooltips for leaflet. Requires `Leaflet@^1.0.0` (support for `leaflet@0.7.x` will come later). Tooltip styling comes from [Bootstrap](https://github.com/twbs/bootstrap).
See the [demo](https://w8r.github.io/Leaflet.Tooltip/example/).

## API

In `leaflet@1.0.0` it's much like `L.Popup`, a layer, so you can `.addLayer(tooltip)` and `.removeLayer(tooltip)`.
Also it can have optional reference to `source`, in the `._source` field, you can do what yout want with it in subclasses, for instance, make the tooltip follow a draggable marker.

* Constructor
  * **`new L.Tooltip(options, source)`**
  * **`L.tooltip(options, source)`**
* Options:
  * `options.position` on of `'left'`, `'right'`, `'top'`, `'bottom'`
  * `options.className` Container class name default: `'tooltip'`
  * `options.arrowClass` Arrow class name, default `'tooltip-arrow'`
  * `options.contentClass` Contewnt class, default `'tooltip-inner'`
  * `options.subtextClass` Subtext, default `'tooltip-subtext'`
  * `options.showClass` Class name to show/hide the tooltip
  * `options.noWrap` Adds the `'nowrap'` class to container, too keep it in one line, default: `false`
  * `options.wrapScreen` Whether to change position on screen edges, defaults to `true`
  * `options.offset` Tooltip offset from the mouse position, default: `[10, 5]`
* `.show(), .hide()`
* `.setLatLng()` Use coordinate to position the tooltip
* `.updatePosition(point)` Use `layerPoint` to update the position - recommended for use with `mousemove` event
* `.setContent('text')`
* `.setSubtext('subtext')`


#### Example

```js

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
```

## License

The MIT License (MIT)
Copyright (c) 2016 Alexander Milevski <info@w8r.name>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
