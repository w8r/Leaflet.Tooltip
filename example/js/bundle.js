(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var L = require('leaflet');
var editable = require('leaflet-editable');
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

},{"../../":2,"leaflet":4,"leaflet-editable":3}],2:[function(require,module,exports){
var L = require('leaflet');
require('./src/Tooltip');

module.exports = L.Tooltip;

},{"./src/Tooltip":5,"leaflet":4}],3:[function(require,module,exports){
'use strict';
(function (factory, window) {
    /*globals define, module, require*/

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);


    // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if(typeof window !== 'undefined' && window.L){
        factory(window.L);
    }

}(function (L) {
    L.Editable = L.Evented.extend({

        statics: {
            FORWARD: 1,
            BACKWARD: -1
        },

        options: {
            zIndex: 1000,
            polygonClass: L.Polygon,
            polylineClass: L.Polyline,
            markerClass: L.Marker,
            rectangleClass: L.Rectangle,
            circleClass: L.Circle,
            drawingCSSClass: 'leaflet-editable-drawing',
            drawingCursor: 'crosshair'
        },

        initialize: function (map, options) {
            L.setOptions(this, options);
            this._lastZIndex = this.options.zIndex;
            this.map = map;
            this.editLayer = this.createEditLayer();
            this.featuresLayer = this.createFeaturesLayer();
            this.forwardLineGuide = this.createLineGuide();
            this.backwardLineGuide = this.createLineGuide();
        },

        fireAndForward: function (type, e) {
            e = e || {};
            e.editTools = this;
            this.fire(type, e);
            this.map.fire(type, e);
        },

        createLineGuide: function () {
            var options = L.extend({dashArray: '5,10', weight: 1, interactive: false}, this.options.lineGuideOptions);
            return L.polyline([], options);
        },

        createVertexIcon: function (options) {
            return L.Browser.touch ? new L.Editable.TouchVertexIcon(options) : new L.Editable.VertexIcon(options);
        },

        createEditLayer: function () {
            return this.options.editLayer || new L.LayerGroup().addTo(this.map);
        },

        createFeaturesLayer: function () {
            return this.options.featuresLayer || new L.LayerGroup().addTo(this.map);
        },

        moveForwardLineGuide: function (latlng) {
            if (this.forwardLineGuide._latlngs.length) {
                this.forwardLineGuide._latlngs[1] = latlng;
                this.forwardLineGuide._bounds.extend(latlng);
                this.forwardLineGuide.redraw();
            }
        },

        moveBackwardLineGuide: function (latlng) {
            if (this.backwardLineGuide._latlngs.length) {
                this.backwardLineGuide._latlngs[1] = latlng;
                this.backwardLineGuide._bounds.extend(latlng);
                this.backwardLineGuide.redraw();
            }
        },

        anchorForwardLineGuide: function (latlng) {
            this.forwardLineGuide._latlngs[0] = latlng;
            this.forwardLineGuide._bounds.extend(latlng);
            this.forwardLineGuide.redraw();
        },

        anchorBackwardLineGuide: function (latlng) {
            this.backwardLineGuide._latlngs[0] = latlng;
            this.backwardLineGuide._bounds.extend(latlng);
            this.backwardLineGuide.redraw();
        },

        attachForwardLineGuide: function () {
            this.editLayer.addLayer(this.forwardLineGuide);
        },

        attachBackwardLineGuide: function () {
            this.editLayer.addLayer(this.backwardLineGuide);
        },

        detachForwardLineGuide: function () {
            this.forwardLineGuide.setLatLngs([]);
            this.editLayer.removeLayer(this.forwardLineGuide);
        },

        detachBackwardLineGuide: function () {
            this.backwardLineGuide.setLatLngs([]);
            this.editLayer.removeLayer(this.backwardLineGuide);
        },

        blockEvents: function () {
            // Hack: force map not to listen to other layers events while drawing.
            if (!this._oldTargets) {
                this._oldTargets = this.map._targets;
                this.map._targets = {};
            }
        },

        unblockEvents: function () {
            if (this._oldTargets) {
                // Reset, but keep targets created while drawing.
                this.map._targets = L.extend(this.map._targets, this._oldTargets);
                delete this._oldTargets;
            }
        },

        registerForDrawing: function (editor) {
            if (this._drawingEditor) this.unregisterForDrawing(this._drawingEditor);
            this.map.on('mousemove touchmove', editor.onDrawingMouseMove, editor);
            this.blockEvents();
            this._drawingEditor = editor;
            this.map.on('mousedown', this.onMousedown, this);
            this.map.on('mouseup', this.onMouseup, this);
            L.DomUtil.addClass(this.map._container, this.options.drawingCSSClass);
            this.defaultMapCursor = this.map._container.style.cursor;
            this.map._container.style.cursor = this.options.drawingCursor;
        },

        unregisterForDrawing: function (editor) {
            this.unblockEvents();
            L.DomUtil.removeClass(this.map._container, this.options.drawingCSSClass);
            this.map._container.style.cursor = this.defaultMapCursor;
            editor = editor || this._drawingEditor;
            if (!editor) return;
            this.map.off('mousemove touchmove', editor.onDrawingMouseMove, editor);
            this.map.off('mousedown', this.onMousedown, this);
            this.map.off('mouseup', this.onMouseup, this);
            if (editor !== this._drawingEditor) return;
            delete this._drawingEditor;
            if (editor._drawing) editor.cancelDrawing();
        },

        onMousedown: function (e) {
            this._mouseDown = e;
            this._drawingEditor.onDrawingMouseDown(e);
        },

        onMouseup: function (e) {
            if (this._mouseDown) {
                var origin = L.point(this._mouseDown.originalEvent.clientX, this._mouseDown.originalEvent.clientY);
                var distance = L.point(e.originalEvent.clientX, e.originalEvent.clientY).distanceTo(origin);
                if (Math.abs(distance) < 9 * (window.devicePixelRatio || 1)) this._drawingEditor.onDrawingClick(e);
                else this._drawingEditor.onDrawingMouseUp(e);
            }
            this._mouseDown = null;
        },

        drawing: function () {
            return this._drawingEditor && this._drawingEditor.drawing();
        },

        stopDrawing: function () {
            this.unregisterForDrawing();
        },

        commitDrawing: function (e) {
            if (!this._drawingEditor) return;
            this._drawingEditor.commitDrawing(e);
        },

        connectCreatedToMap: function (layer) {
            return this.featuresLayer.addLayer(layer);
        },

        startPolyline: function (latlng, options) {
            var line = this.createPolyline([], options);
            line.enableEdit(this.map).newShape(latlng);
            return line;
        },

        startPolygon: function (latlng, options) {
            var polygon = this.createPolygon([], options);
            polygon.enableEdit(this.map).newShape(latlng);
            return polygon;
        },

        startMarker: function (latlng, options) {
            latlng = latlng || this.map.getCenter().clone();
            var marker = this.createMarker(latlng, options);
            marker.enableEdit(this.map).startDrawing();
            return marker;
        },

        startRectangle: function(latlng, options) {
            var corner = latlng || L.latLng([0, 0]);
            var bounds = new L.LatLngBounds(corner, corner);
            var rectangle = this.createRectangle(bounds, options);
            rectangle.enableEdit(this.map).startDrawing();
            return rectangle;
        },

        startCircle: function (latlng, options) {
            latlng = latlng || this.map.getCenter().clone();
            var circle = this.createCircle(latlng, options);
            circle.enableEdit(this.map).startDrawing();
            return circle;
        },

        startHole: function (editor, latlng) {
            editor.newHole(latlng);
        },

        createLayer: function (klass, latlngs, options) {
            options = L.Util.extend({editOptions: {editTools: this}}, options);
            var layer = new klass(latlngs, options);
            this.fireAndForward('editable:created', {layer: layer});
            return layer;
        },

        createPolyline: function (latlngs, options) {
            return this.createLayer(options && options.polylineClass || this.options.polylineClass, latlngs, options);
        },

        createPolygon: function (latlngs, options) {
            return this.createLayer(options && options.polygonClass || this.options.polygonClass, latlngs, options);
        },

        createMarker: function (latlng, options) {
            return this.createLayer(options && options.markerClass || this.options.markerClass, latlng, options);
        },

        createRectangle: function (bounds, options) {
            return this.createLayer(options && options.rectangleClass || this.options.rectangleClass, bounds, options);
        },

        createCircle: function (latlng, options) {
            return this.createLayer(options && options.circleClass || this.options.circleClass, latlng, options);
        }

    });

    L.extend(L.Editable, {

        makeCancellable: function (e) {
            e.cancel = function () {
                e._cancelled = true;
            };
        }

    });

    L.Map.mergeOptions({
        editToolsClass: L.Editable
    });

    L.Map.addInitHook(function () {

        this.whenReady(function () {
            if (this.options.editable) {
                this.editTools = new this.options.editToolsClass(this, this.options.editOptions);
            }
        });

    });

    L.Editable.VertexIcon = L.DivIcon.extend({

        options: {
            iconSize: new L.Point(8, 8)
        }

    });

    L.Editable.TouchVertexIcon = L.Editable.VertexIcon.extend({

        options: {
            iconSize: new L.Point(20, 20)
        }

    });


    L.Editable.VertexMarker = L.Marker.extend({

        options: {
            draggable: true,
            className: 'leaflet-div-icon leaflet-vertex-icon'
        },

        initialize: function (latlng, latlngs, editor, options) {
            // We don't use this._latlng, because on drag Leaflet replace it while
            // we want to keep reference.
            this.latlng = latlng;
            this.latlngs = latlngs;
            this.editor = editor;
            L.Marker.prototype.initialize.call(this, latlng, options);
            this.options.icon = this.editor.tools.createVertexIcon({className: this.options.className});
            this.latlng.__vertex = this;
            this.editor.editLayer.addLayer(this);
            this.setZIndexOffset(editor.tools._lastZIndex + 1);
        },

        onAdd: function (map) {
            L.Marker.prototype.onAdd.call(this, map);
            this.on('drag', this.onDrag);
            this.on('dragstart', this.onDragStart);
            this.on('dragend', this.onDragEnd);
            this.on('mouseup', this.onMouseup);
            this.on('click', this.onClick);
            this.on('contextmenu', this.onContextMenu);
            this.on('mousedown touchstart', this.onMouseDown);
            this.addMiddleMarkers();
        },

        onRemove: function (map) {
            if (this.middleMarker) this.middleMarker.delete();
            delete this.latlng.__vertex;
            this.off('drag', this.onDrag);
            this.off('dragstart', this.onDragStart);
            this.off('dragend', this.onDragEnd);
            this.off('mouseup', this.onMouseup);
            this.off('click', this.onClick);
            this.off('contextmenu', this.onContextMenu);
            this.off('mousedown touchstart', this.onMouseDown);
            L.Marker.prototype.onRemove.call(this, map);
        },

        onDrag: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerDrag(e);
            var iconPos = L.DomUtil.getPosition(this._icon),
                latlng = this._map.layerPointToLatLng(iconPos);
            this.latlng.update(latlng);
            this._latlng = this.latlng;  // Push back to Leaflet our reference.
            this.editor.refresh();
            if (this.middleMarker) {
                this.middleMarker.updateLatLng();
            }
            var next = this.getNext();
            if (next && next.middleMarker) {
                next.middleMarker.updateLatLng();
            }
        },

        onDragStart: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerDragStart(e);
        },

        onDragEnd: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerDragEnd(e);
        },

        onClick: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerClick(e);
        },

        onMouseup: function (e) {
            L.DomEvent.stop(e);
            e.vertex = this;
            this.editor.map.fire('mouseup', e);
        },

        onContextMenu: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerContextMenu(e);
        },

        onMouseDown: function (e) {
            e.vertex = this;
            this.editor.onVertexMarkerMouseDown(e);
        },

        delete: function () {
            var next = this.getNext();  // Compute before changing latlng
            this.latlngs.splice(this.getIndex(), 1);
            this.editor.editLayer.removeLayer(this);
            this.editor.onVertexDeleted({latlng: this.latlng, vertex: this});
            if (!this.latlngs.length) this.editor.deleteShape(this.latlngs);
            if (next) next.resetMiddleMarker();
            this.editor.refresh();
        },

        getIndex: function () {
            return this.latlngs.indexOf(this.latlng);
        },

        getLastIndex: function () {
            return this.latlngs.length - 1;
        },

        getPrevious: function () {
            if (this.latlngs.length < 2) return;
            var index = this.getIndex(),
                previousIndex = index - 1;
            if (index === 0 && this.editor.CLOSED) previousIndex = this.getLastIndex();
            var previous = this.latlngs[previousIndex];
            if (previous) return previous.__vertex;
        },

        getNext: function () {
            if (this.latlngs.length < 2) return;
            var index = this.getIndex(),
                nextIndex = index + 1;
            if (index === this.getLastIndex() && this.editor.CLOSED) nextIndex = 0;
            var next = this.latlngs[nextIndex];
            if (next) return next.__vertex;
        },

        addMiddleMarker: function (previous) {
            if (!this.editor.hasMiddleMarkers()) return;
            previous = previous || this.getPrevious();
            if (previous && !this.middleMarker) this.middleMarker = this.editor.addMiddleMarker(previous, this, this.latlngs, this.editor);
        },

        addMiddleMarkers: function () {
            if (!this.editor.hasMiddleMarkers()) return;
            var previous = this.getPrevious();
            if (previous) {
                this.addMiddleMarker(previous);
            }
            var next = this.getNext();
            if (next) {
                next.resetMiddleMarker();
            }
        },

        resetMiddleMarker: function () {
            if (this.middleMarker) this.middleMarker.delete();
            this.addMiddleMarker();
        },

        split: function () {
            if (!this.editor.splitShape) return;  // Only for PolylineEditor
            this.editor.splitShape(this.latlngs, this.getIndex());
        },

        continue: function () {
            if (!this.editor.continueBackward) return;  // Only for PolylineEditor
            var index = this.getIndex();
            if (index === 0) this.editor.continueBackward(this.latlngs);
            else if (index === this.getLastIndex()) this.editor.continueForward(this.latlngs);
        }

    });

    L.Editable.mergeOptions({
        vertexMarkerClass: L.Editable.VertexMarker
    });

    L.Editable.MiddleMarker = L.Marker.extend({

        options: {
            opacity: 0.5,
            className: 'leaflet-div-icon leaflet-middle-icon',
            draggable: true
        },

        initialize: function (left, right, latlngs, editor, options) {
            this.left = left;
            this.right = right;
            this.editor = editor;
            this.latlngs = latlngs;
            L.Marker.prototype.initialize.call(this, this.computeLatLng(), options);
            this._opacity = this.options.opacity;
            this.options.icon = this.editor.tools.createVertexIcon({className: this.options.className});
            this.editor.editLayer.addLayer(this);
            this.setVisibility();
        },

        setVisibility: function () {
            var leftPoint = this._map.latLngToContainerPoint(this.left.latlng),
                rightPoint = this._map.latLngToContainerPoint(this.right.latlng),
                size = L.point(this.options.icon.options.iconSize);
            if (leftPoint.distanceTo(rightPoint) < size.x * 3) {
                this.hide();
            } else {
                this.show();
            }
        },

        show: function () {
            this.setOpacity(this._opacity);
        },

        hide: function () {
            this.setOpacity(0);
        },

        updateLatLng: function () {
            this.setLatLng(this.computeLatLng());
            this.setVisibility();
        },

        computeLatLng: function () {
            var leftPoint = this.editor.map.latLngToContainerPoint(this.left.latlng),
                rightPoint = this.editor.map.latLngToContainerPoint(this.right.latlng),
                y = (leftPoint.y + rightPoint.y) / 2,
                x = (leftPoint.x + rightPoint.x) / 2;
            return this.editor.map.containerPointToLatLng([x, y]);
        },

        onAdd: function (map) {
            L.Marker.prototype.onAdd.call(this, map);
            L.DomEvent.on(this._icon, 'mousedown touchstart', this.onMouseDown, this);
            map.on('zoomend', this.setVisibility, this);
        },

        onRemove: function (map) {
            delete this.right.middleMarker;
            L.DomEvent.off(this._icon, 'mousedown touchstart', this.onMouseDown, this);
            map.off('zoomend', this.setVisibility, this);
            L.Marker.prototype.onRemove.call(this, map);
        },

        onMouseDown: function (e) {
            var iconPos = L.DomUtil.getPosition(this._icon),
                latlng = this.editor.map.layerPointToLatLng(iconPos);
            e = {
                originalEvent: e,
                latlng: latlng
            };
            if (this.options.opacity === 0) return;
            L.Editable.makeCancellable(e);
            this.editor.onMiddleMarkerMouseDown(e);
            if (e._cancelled) return;
            this.latlngs.splice(this.index(), 0, e.latlng);
            this.editor.refresh();
            var icon = this._icon;
            var marker = this.editor.addVertexMarker(e.latlng, this.latlngs);
            /* Hack to workaround browser not firing touchend when element is no more on DOM */
            var parent = marker._icon.parentNode;
            parent.removeChild(marker._icon);
            marker._icon = icon;
            parent.appendChild(marker._icon);
            marker._initIcon();
            marker._initInteraction();
            marker.setOpacity(1);
            /* End hack */
            // Transfer ongoing dragging to real marker
            L.Draggable._dragging = false;
            marker.dragging._draggable._onDown(e.originalEvent);
            this.delete();
        },

        delete: function () {
            this.editor.editLayer.removeLayer(this);
        },

        index: function () {
            return this.latlngs.indexOf(this.right.latlng);
        }

    });

    L.Editable.mergeOptions({
        middleMarkerClass: L.Editable.MiddleMarker
    });

    L.Editable.BaseEditor = L.Class.extend({

        initialize: function (map, feature, options) {
            L.setOptions(this, options);
            this.map = map;
            this.feature = feature;
            this.feature.editor = this;
            this.editLayer = new L.LayerGroup();
            this.tools = this.options.editTools || map.editTools;
        },

        enable: function () {
            if (this._enabled) return this;
            if (this.isConnected()) this.tools.editLayer.addLayer(this.editLayer);
            this.onEnable();
            this._enabled = true;
            this.feature.on('remove', this.disable, this);
            return this;
        },

        disable: function () {
            this.feature.off('remove', this.disable, this);
            this.editLayer.clearLayers();
            this.tools.editLayer.removeLayer(this.editLayer);
            this.onDisable();
            delete this._enabled;
            if (this._drawing) this.cancelDrawing();
            return this;
        },

        drawing: function () {
            return !!this._drawing;
        },

        hasMiddleMarkers: function () {
            return !this.options.skipMiddleMarkers && !this.tools.options.skipMiddleMarkers;
        },

        fireAndForward: function (type, e) {
            e = e || {};
            e.layer = this.feature;
            this.feature.fire(type, e);
            this.tools.fireAndForward(type, e);
        },

        onEnable: function () {
            this.fireAndForward('editable:enable');
        },

        onDisable: function () {
            this.fireAndForward('editable:disable');
        },

        onEditing: function () {
            this.fireAndForward('editable:editing');
        },

        onStartDrawing: function () {
            this.fireAndForward('editable:drawing:start');
        },

        onEndDrawing: function () {
            this.fireAndForward('editable:drawing:end');
        },

        onCancelDrawing: function () {
            this.fireAndForward('editable:drawing:cancel');
        },

        onCommitDrawing: function (e) {
            this.fireAndForward('editable:drawing:commit', e);
        },

        onDrawingMouseDown: function (e) {
            this.fireAndForward('editable:drawing:mousedown', e);
        },

        onDrawingMouseUp: function (e) {
            this.fireAndForward('editable:drawing:mouseup', e);
        },

        startDrawing: function () {
            if (!this._drawing) this._drawing = L.Editable.FORWARD;
            this.tools.registerForDrawing(this);
            this.onStartDrawing();
        },

        commitDrawing: function (e) {
            this.onCommitDrawing(e);
            this.endDrawing();
        },

        cancelDrawing: function () {
            this.onCancelDrawing();
            this.endDrawing();
        },

        endDrawing: function () {
            this._drawing = false;
            this.tools.unregisterForDrawing(this);
            this.onEndDrawing();
        },

        onDrawingClick: function (e) {
            if (!this.drawing) return;
            L.Editable.makeCancellable(e);
            this.fireAndForward('editable:drawing:click', e);
            if (e._cancelled) return;
            if (!this.isConnected()) this.connect(e);
            this.processDrawingClick(e);
        },

        isConnected: function () {
            return this.map.hasLayer(this.feature);
        },

        connect: function (e) {
            this.tools.connectCreatedToMap(this.feature);
            this.tools.editLayer.addLayer(this.editLayer);
        },

        onMove: function (e) {
            this.fireAndForward('editable:drawing:move', e);
        },

        onDrawingMouseMove: function (e) {
            this.onMove(e);
        }

    });

    L.Editable.MarkerEditor = L.Editable.BaseEditor.extend({

        enable: function () {
            if (this._enabled) return this;
            L.Editable.BaseEditor.prototype.enable.call(this);
            if (this.isConnected()) this.enableDragging();
            else this.feature.on('add', this.enableDragging, this);
            this.feature.on('dragstart', this.onEditing, this);
            this.feature.on('drag', this.onMove, this);
            return this;
        },

        disable: function () {
            L.Editable.BaseEditor.prototype.disable.call(this);
            if (this.feature.dragging) this.feature.dragging.disable();
            this.feature.off('dragstart', this.onEditing, this);
            this.feature.off('drag', this.onMove, this);
            return this;
        },

        enableDragging: function () {
            this.feature.dragging.enable();
        },

        onDrawingMouseMove: function (e) {
            L.Editable.BaseEditor.prototype.onDrawingMouseMove.call(this, e);
            if (this._drawing) this.feature.setLatLng(e.latlng);
        },

        processDrawingClick: function (e) {
            this.fireAndForward('editable:drawing:clicked', e);
            this.commitDrawing(e);
        },

        connect: function (e) {
            // On touch, the latlng has not been updated because there is
            // no mousemove.
            if (e) this.feature._latlng = e.latlng;
            L.Editable.BaseEditor.prototype.connect.call(this, e);
        }

    });

    L.Editable.PathEditor = L.Editable.BaseEditor.extend({

        CLOSED: false,
        MIN_VERTEX: 2,

        enable: function () {
            if (this._enabled) return this;
            L.Editable.BaseEditor.prototype.enable.call(this);
            if (this.feature) {
                this.initVertexMarkers();
            }
            return this;
        },

        disable: function () {
            return L.Editable.BaseEditor.prototype.disable.call(this);
        },

        initVertexMarkers: function (latlngs) {
            latlngs = latlngs || this.getLatLngs();
            if (L.Polyline._flat(latlngs)) this.addVertexMarkers(latlngs);
            else for (var i = 0; i < latlngs.length; i++) this.initVertexMarkers(latlngs[i]);
        },

        getLatLngs: function () {
            return this.feature.getLatLngs();
        },

        reset: function () {
            this.editLayer.clearLayers();
            this.initVertexMarkers();
        },

        addVertexMarker: function (latlng, latlngs) {
            return new this.tools.options.vertexMarkerClass(latlng, latlngs, this);
        },

        addVertexMarkers: function (latlngs) {
            for (var i = 0; i < latlngs.length; i++) {
                this.addVertexMarker(latlngs[i], latlngs);
            }
        },

        refreshVertexMarkers: function (latlngs) {
            latlngs = latlngs || this.getDefaultLatLngs();
            for (var i = 0; i < latlngs.length; i++) {
                latlngs[i].__vertex.update();
            }
        },

        addMiddleMarker: function (left, right, latlngs) {
            return new this.tools.options.middleMarkerClass(left, right, latlngs, this);
        },

        onVertexMarkerClick: function (e) {
            L.Editable.makeCancellable(e);
            this.fireAndForward('editable:vertex:click', e);
            if (e._cancelled) return;
            if (this.tools.drawing() && this.tools._drawingEditor !== this) return;
            var index = e.vertex.getIndex(), commit;
            if (e.originalEvent.ctrlKey) {
                this.onVertexMarkerCtrlClick(e);
            } else if (e.originalEvent.altKey) {
                this.onVertexMarkerAltClick(e);
            } else if (e.originalEvent.shiftKey) {
                this.onVertexMarkerShiftClick(e);
            } else if (e.originalEvent.metaKey) {
                this.onVertexMarkerMetaKeyClick(e);
            } else if (index === e.vertex.getLastIndex() && this._drawing === L.Editable.FORWARD) {
                if (index >= this.MIN_VERTEX - 1) commit = true;
            } else if (index === 0 && this._drawing === L.Editable.BACKWARD && this._drawnLatLngs.length >= this.MIN_VERTEX) {
                commit = true;
            } else if (index === 0 && this._drawing === L.Editable.FORWARD && this._drawnLatLngs.length >= this.MIN_VERTEX && this.CLOSED) {
                commit = true;  // Allow to close on first point also for polygons
            } else {
                this.onVertexRawMarkerClick(e);
            }
            this.fireAndForward('editable:vertex:clicked', e);
            if (commit) this.commitDrawing(e);
        },

        onVertexRawMarkerClick: function (e) {
            this.fireAndForward('editable:vertex:rawclick', e);
            if (e._cancelled) return;
            if (!this.vertexCanBeDeleted(e.vertex)) return;
            e.vertex.delete();
        },

        vertexCanBeDeleted: function (vertex) {
            return vertex.latlngs.length > this.MIN_VERTEX;
        },

        onVertexDeleted: function (e) {
            this.fireAndForward('editable:vertex:deleted', e);
        },

        onVertexMarkerCtrlClick: function (e) {
            this.fireAndForward('editable:vertex:ctrlclick', e);
        },

        onVertexMarkerShiftClick: function (e) {
            this.fireAndForward('editable:vertex:shiftclick', e);
        },

        onVertexMarkerMetaKeyClick: function (e) {
            this.fireAndForward('editable:vertex:metakeyclick', e);
        },

        onVertexMarkerAltClick: function (e) {
            this.fireAndForward('editable:vertex:altclick', e);
        },

        onVertexMarkerContextMenu: function (e) {
            this.fireAndForward('editable:vertex:contextmenu', e);
        },

        onVertexMarkerMouseDown: function (e) {
            this.fireAndForward('editable:vertex:mousedown', e);
        },

        onMiddleMarkerMouseDown: function (e) {
            this.fireAndForward('editable:middlemarker:mousedown', e);
        },

        onVertexMarkerDrag: function (e) {
            this.onMove(e);
            if (this.feature._bounds) this.extendBounds(e);
            this.fireAndForward('editable:vertex:drag', e);
        },

        onVertexMarkerDragStart: function (e) {
            this.fireAndForward('editable:vertex:dragstart', e);
        },

        onVertexMarkerDragEnd: function (e) {
            this.fireAndForward('editable:vertex:dragend', e);
        },

        setDrawnLatLngs: function (latlngs) {
            this._drawnLatLngs = latlngs || this.getDefaultLatLngs();
        },

        startDrawing: function () {
            if (!this._drawnLatLngs) this.setDrawnLatLngs();
            L.Editable.BaseEditor.prototype.startDrawing.call(this);
        },

        startDrawingForward: function () {
            this.startDrawing();
            this.tools.attachForwardLineGuide();
        },

        endDrawing: function () {
            this.tools.detachForwardLineGuide();
            this.tools.detachBackwardLineGuide();
            if (this._drawnLatLngs && this._drawnLatLngs.length < this.MIN_VERTEX) this.deleteShape(this._drawnLatLngs);
            L.Editable.BaseEditor.prototype.endDrawing.call(this);
            delete this._drawnLatLngs;
        },

        addLatLng: function (latlng) {
            if (this._drawing === L.Editable.FORWARD) this._drawnLatLngs.push(latlng);
            else this._drawnLatLngs.unshift(latlng);
            this.feature._bounds.extend(latlng);
            this.addVertexMarker(latlng, this._drawnLatLngs);
            this.refresh();
        },

        newPointForward: function (latlng) {
            this.addLatLng(latlng);
            this.tools.anchorForwardLineGuide(latlng);
            if (!this.tools.backwardLineGuide._latlngs[0]) {
                this.tools.anchorBackwardLineGuide(latlng);
            }
        },

        newPointBackward: function (latlng) {
            this.addLatLng(latlng);
            this.tools.anchorBackwardLineGuide(latlng);
        },

        push: function (latlng) {
            if (!latlng) return console.error('L.Editable.PathEditor.push expect a vaild latlng as parameter');
            if (this._drawing === L.Editable.FORWARD) this.newPointForward(latlng);
            else this.newPointBackward(latlng);
        },

        removeLatLng: function (latlng) {
            latlng.__vertex.delete();
            this.refresh();
        },

        pop: function () {
            if (this._drawnLatLngs.length <= 1) return;
            var latlng;
            if (this._drawing === L.Editable.FORWARD) latlng = this._drawnLatLngs[this._drawnLatLngs.length - 1];
            else latlng = this._drawnLatLngs[0];
            this.removeLatLng(latlng);
            if (this._drawing === L.Editable.FORWARD) this.tools.anchorForwardLineGuide(this._drawnLatLngs[this._drawnLatLngs.length - 1]);
            else this.tools.anchorForwardLineGuide(this._drawnLatLngs[0]);
            return latlng;
        },

        processDrawingClick: function (e) {
            if (e.vertex && e.vertex.editor === this) return;
            if (this._drawing === L.Editable.FORWARD) this.newPointForward(e.latlng);
            else this.newPointBackward(e.latlng);
            this.fireAndForward('editable:drawing:clicked', e);
        },

        onDrawingMouseMove: function (e) {
            L.Editable.BaseEditor.prototype.onDrawingMouseMove.call(this, e);
            if (this._drawing) {
                this.tools.moveForwardLineGuide(e.latlng);
                this.tools.moveBackwardLineGuide(e.latlng);
            }
        },

        refresh: function () {
            this.feature.redraw();
            this.onEditing();
        },

        newShape: function (latlng) {
            var shape = this.addNewEmptyShape();
            if (!shape) return;
            this.setDrawnLatLngs(shape[0] || shape);  // Polygon or polyline
            this.startDrawingForward();
            this.fireAndForward('editable:shape:new', {shape: shape});
            if (latlng) this.newPointForward(latlng);
        },

        deleteShape: function (shape, latlngs) {
            var e = {shape: shape};
            L.Editable.makeCancellable(e);
            this.fireAndForward('editable:shape:delete', e);
            if (e._cancelled) return;
            shape = this._deleteShape(shape, latlngs);
            if (this.ensureNotFlat) this.ensureNotFlat();  // Polygon.
            this.feature.setLatLngs(this.getLatLngs());  // Force bounds reset.
            this.refresh();
            this.reset();
            this.fireAndForward('editable:shape:deleted', {shape: shape});
            return shape;
        },

        _deleteShape: function (shape, latlngs) {
            latlngs = latlngs || this.getLatLngs();
            if (!latlngs.length) return;
            var self = this,
                inplaceDelete = function (latlngs, shape) {
                    // Called when deleting a flat latlngs
                    shape = latlngs.splice(0, Number.MAX_VALUE);
                    return shape;
                },
                spliceDelete = function (latlngs, shape) {
                    // Called when removing a latlngs inside an array
                    latlngs.splice(latlngs.indexOf(shape), 1);
                    if (!latlngs.length) self._deleteShape(latlngs);
                    return shape;
                };
            if (latlngs === shape) return inplaceDelete(latlngs, shape);
            for (var i = 0; i < latlngs.length; i++) {
                if (latlngs[i] === shape) return spliceDelete(latlngs, shape);
                else if (latlngs[i].indexOf(shape) !== -1) return spliceDelete(latlngs[i], shape);
            }
        },

        deleteShapeAt: function (latlng) {
            var shape = this.feature.shapeAt(latlng);
            if (shape) return this.deleteShape(shape);
        },

        appendShape: function (shape) {
            this.insertShape(shape);
        },

        prependShape: function (shape) {
            this.insertShape(shape, 0);
        },

        insertShape: function (shape, index) {
            this.ensureMulti();
            shape = this.formatShape(shape);
            if (typeof index === 'undefined') index = this.feature._latlngs.length;
            this.feature._latlngs.splice(index, 0, shape);
            this.feature.redraw();
            if (this._enabled) this.reset();
        },

        extendBounds: function (e) {
            this.feature._bounds.extend(e.vertex.latlng);
        }

    });

    L.Editable.PolylineEditor = L.Editable.PathEditor.extend({

        startDrawingBackward: function (latlngs) {
            this._drawing = L.Editable.BACKWARD;
            this.startDrawing(latlngs);
            this.tools.attachBackwardLineGuide();
        },

        continueBackward: function (latlngs) {
            if (this.drawing()) return;
            latlngs = latlngs || this.getDefaultLatLngs();
            this.setDrawnLatLngs(latlngs);
            this.tools.anchorBackwardLineGuide(latlngs[0]);
            this.startDrawingBackward();
        },

        continueForward: function (latlngs) {
            if (this.drawing()) return;
            latlngs = latlngs || this.getDefaultLatLngs();
            this.setDrawnLatLngs(latlngs);
            this.tools.anchorForwardLineGuide(latlngs[latlngs.length - 1]);
            this.startDrawingForward();
        },

        getDefaultLatLngs: function (latlngs) {
            latlngs = latlngs || this.feature._latlngs;
            if (!latlngs.length || latlngs[0] instanceof L.LatLng) return latlngs;
            else return this.getDefaultLatLngs(latlngs[0]);
        },

        ensureMulti: function () {
            if (this.feature._latlngs.length && L.Polyline._flat(this.feature._latlngs)) {
                this.feature._latlngs = [this.feature._latlngs];
            }
        },

        addNewEmptyShape: function () {
            if (this.feature._latlngs.length) {
                var shape = [];
                this.appendShape(shape);
                return shape;
            } else {
                return this.feature._latlngs;
            }
        },

        formatShape: function (shape) {
            if (L.Polyline._flat(shape)) return shape;
            else if (shape[0]) return this.formatShape(shape[0]);
        },

        splitShape: function (shape, index) {
            if (!index || index >= shape.length - 1) return;
            this.ensureMulti();
            var shapeIndex = this.feature._latlngs.indexOf(shape);
            if (shapeIndex === -1) return;
            var first = shape.slice(0, index + 1),
                second = shape.slice(index);
            // We deal with reference, we don't want twice the same latlng around.
            second[0] = L.latLng(second[0].lat, second[0].lng, second[0].alt);
            this.feature._latlngs.splice(shapeIndex, 1, first, second);
            this.refresh();
            this.reset();
        }

    });

    L.Editable.PolygonEditor = L.Editable.PathEditor.extend({

        CLOSED: true,
        MIN_VERTEX: 3,

        startDrawingForward: function () {
            L.Editable.PathEditor.prototype.startDrawingForward.call(this);
            this.tools.attachBackwardLineGuide();
        },

        addNewEmptyHole: function (latlng) {
            this.ensureNotFlat();
            var latlngs = this.feature.shapeAt(latlng);
            if (!latlngs) return;
            var holes = [];
            latlngs.push(holes);
            return holes;
        },

        newHole: function (latlng) {
            var holes = this.addNewEmptyHole(latlng);
            if (!holes) return;
            this.setDrawnLatLngs(holes);
            this.startDrawingForward();
            if (latlng) this.newPointForward(latlng);
        },

        addNewEmptyShape: function () {
            if (this.feature._latlngs.length && this.feature._latlngs[0].length) {
                var shape = [];
                this.appendShape(shape);
                return shape;
            } else {
                return this.feature._latlngs;
            }
        },

        ensureMulti: function () {
            if (this.feature._latlngs.length && L.Polyline._flat(this.feature._latlngs[0])) {
                this.feature._latlngs = [this.feature._latlngs];
            }
        },

        ensureNotFlat: function () {
            if (!this.feature._latlngs.length || L.Polyline._flat(this.feature._latlngs)) this.feature._latlngs = [this.feature._latlngs];
        },

        vertexCanBeDeleted: function (vertex) {
            var parent = this.feature.parentShape(vertex.latlngs),
                idx = L.Util.indexOf(parent, vertex.latlngs);
            if (idx > 0) return true;  // Holes can be totally deleted without removing the layer itself.
            return L.Editable.PathEditor.prototype.vertexCanBeDeleted.call(this, vertex);
        },

        getDefaultLatLngs: function () {
            if (!this.feature._latlngs.length) this.feature._latlngs.push([]);
            return this.feature._latlngs[0];
        },

        formatShape: function (shape) {
            // [[1, 2], [3, 4]] => must be nested
            // [] => must be nested
            // [[]] => is already nested
            if (L.Polyline._flat(shape) && (!shape[0] || shape[0].length !== 0)) return [shape];
            else return shape;
        }

    });

    L.Editable.RectangleEditor = L.Editable.PathEditor.extend({

        CLOSED: true,
        MIN_VERTEX: 4,

        options: {
            skipMiddleMarkers: true
        },

        extendBounds: function (e) {
            var index = e.vertex.getIndex(),
                oppositeIndex = (index + 2) % 4,
                opposite = e.vertex.latlngs[oppositeIndex],
                bounds = new L.LatLngBounds(e.latlng, opposite);
            this.updateBounds(bounds);
            this.refreshVertexMarkers();
        },

        onDrawingMouseDown: function (e) {
            this.connect();
            var latlngs = this.getDefaultLatLngs();
            // L.Polygon._convertLatLngs removes last latlng if it equals first point,
            // which is the case here as all latlngs are [0, 0]
            if (latlngs.length === 3) latlngs.push(e.latlng);
            var bounds = new L.LatLngBounds(e.latlng, e.latlng);
            this.updateBounds(bounds);
            this.refresh();
            this.reset();
            this.commitDrawing(e);
            // Stop dragging map.
            this.map.dragging._draggable._onUp(e.originalEvent);
            // Now transfer ongoing drag action to the bottom right corner.
            // Should we refine which corne will handle the drag according to
            // drag direction?
            latlngs[3].__vertex.dragging._draggable._onDown(e.originalEvent);
        },

        getDefaultLatLngs: function (latlngs) {
            return latlngs || this.feature._latlngs[0];
        },

        updateBounds: function (bounds) {
            this.feature._bounds = bounds;
            var latlngs = this.getDefaultLatLngs(),
                newLatlngs = this.feature._boundsToLatLngs(bounds);
            // Keep references.
            for (var i = 0; i < latlngs.length; i++) {
                latlngs[i].update(newLatlngs[i]);
            };
        }

    });

    L.Editable.CircleEditor = L.Editable.PathEditor.extend({

        MIN_VERTEX: 2,

        options: {
            skipMiddleMarkers: true
        },

        initialize: function (map, feature, options) {
            L.Editable.PathEditor.prototype.initialize.call(this, map, feature, options);
            this._resizeLatLng = this.computeResizeLatLng();
        },

        computeResizeLatLng: function () {
            // While circle is not added to the map, _radius is not set.
            var delta = (this.feature._radius || this.feature._mRadius) * Math.cos(Math.PI / 4),
                point = this.map.project(this.feature._latlng);
            return this.map.unproject([point.x + delta, point.y - delta]);
        },

        updateResizeLatLng: function () {
            this._resizeLatLng.update(this.computeResizeLatLng());
            this._resizeLatLng.__vertex.update();
        },

        getLatLngs: function () {
            return [this.feature._latlng, this._resizeLatLng];
        },

        getDefaultLatLngs: function () {
            return this.getLatLngs();
        },

        onVertexMarkerDrag: function (e) {
            if (e.vertex.getIndex() === 1) this.resize(e);
            else this.updateResizeLatLng(e);
            L.Editable.PathEditor.prototype.onVertexMarkerDrag.call(this, e);
        },

        resize: function (e) {
            var radius = this.feature._latlng.distanceTo(e.latlng)
            this.feature.setRadius(radius);
        },

        onDrawingMouseDown: function (e) {
            this._resizeLatLng.update(e.latlng);
            this.feature._latlng.update(e.latlng);
            this.connect();
            this.commitDrawing(e);
            // Stop dragging map.
            this.map.dragging._draggable._onUp(e.originalEvent);
            // Now transfer ongoing drag action to the radius handler.
            this._resizeLatLng.__vertex.dragging._draggable._onDown(e.originalEvent);
        },

        onDrawingMouseMove: function (e) {
            L.Editable.BaseEditor.prototype.onDrawingMouseMove.call(this, e);
            this.feature._latlng.update(e.latlng);
            this.feature._latlng.__vertex.update();
        }

    });

    var EditableMixin = {

        createEditor: function (map) {
            map = map || this._map;
            var Klass = this.options.editorClass || this.getEditorClass(map);
            return new Klass(map, this, this.options.editOptions);
        },

        enableEdit: function (map) {
            if (!this.editor) this.createEditor(map);
            return this.editor.enable();
        },

        editEnabled: function () {
            return this.editor && this.editor._enabled;
        },

        disableEdit: function () {
            if (this.editor) {
                this.editor.disable();
                delete this.editor;
            }
        },

        toggleEdit: function () {
            if (this.editEnabled()) {
                this.disableEdit();
            } else {
                this.enableEdit();
            }
        },

        _onEditableAdd: function () {
            if (this.editor) this.enableEdit();
        }

    };

    L.Polyline.include(EditableMixin);
    L.Polygon.include(EditableMixin);
    L.Marker.include(EditableMixin);
    L.Rectangle.include(EditableMixin);
    L.Circle.include(EditableMixin);

    L.Polyline.include({

        getEditorClass: function (map) {
            return (map && map.options.polylineEditorClass) ? map.options.polylineEditorClass : L.Editable.PolylineEditor;
        },

        shapeAt: function (latlng, latlngs) {
            // We can have those cases:
            // - latlngs are just a flat array of latlngs, use this
            // - latlngs is an array of arrays of latlngs, loop over
            var shape = null;
            latlngs = latlngs || this._latlngs;
            if (!latlngs.length) return shape;
            else if (L.Polyline._flat(latlngs) && this.isInLatLngs(latlng, latlngs)) shape = latlngs;
            else for (var i = 0; i < latlngs.length; i++) if (this.isInLatLngs(latlng, latlngs[i])) return latlngs[i];
            return shape;
        },

        isInLatLngs: function (l, latlngs) {
            if (!latlngs) return false;
            var i, k, len, part = [], p,
                w = this._clickTolerance();
            this._projectLatlngs(latlngs, part, this._pxBounds);
            part = part[0];
            p = this._map.latLngToLayerPoint(l);

            if (!this._pxBounds.contains(p)) { return false; }
            for (i = 1, len = part.length, k = 0; i < len; k = i++) {

                if (L.LineUtil.pointToSegmentDistance(p, part[k], part[i]) <= w) {
                    return true;
                }
            }
            return false;
        }

    });

    L.Polygon.include({

        getEditorClass: function (map) {
            return (map && map.options.polygonEditorClass) ? map.options.polygonEditorClass : L.Editable.PolygonEditor;
        },

        shapeAt: function (latlng, latlngs) {
            // We can have those cases:
            // - latlngs are just a flat array of latlngs, use this
            // - latlngs is an array of arrays of latlngs, this is a simple polygon (maybe with holes), use the first
            // - latlngs is an array of arrays of arrays, this is a multi, loop over
            var shape = null;
            latlngs = latlngs || this._latlngs;
            if (!latlngs.length) return shape;
            else if (L.Polyline._flat(latlngs) && this.isInLatLngs(latlng, latlngs)) shape = latlngs;
            else if (L.Polyline._flat(latlngs[0]) && this.isInLatLngs(latlng, latlngs[0])) shape = latlngs;
            else for (var i = 0; i < latlngs.length; i++) if (this.isInLatLngs(latlng, latlngs[i][0])) return latlngs[i];
            return shape;
        },

        isInLatLngs: function (l, latlngs) {
            var inside = false, l1, l2, j, k, len2;

            for (j = 0, len2 = latlngs.length, k = len2 - 1; j < len2; k = j++) {
                l1 = latlngs[j];
                l2 = latlngs[k];

                if (((l1.lat > l.lat) !== (l2.lat > l.lat)) &&
                        (l.lng < (l2.lng - l1.lng) * (l.lat - l1.lat) / (l2.lat - l1.lat) + l1.lng)) {
                    inside = !inside;
                }
            }

            return inside;
        },

        parentShape: function (shape, latlngs) {
            latlngs = latlngs || this._latlngs;
            if (!latlngs) return;
            var idx = L.Util.indexOf(latlngs, shape);
            if (idx !== -1) return latlngs;
            for (var i = 0; i < latlngs.length; i++) {
                idx = L.Util.indexOf(latlngs[i], shape);
                if (idx !== -1) return latlngs[i];
            }
        }

    });

    L.Marker.include({

        getEditorClass: function (map) {
            return (map && map.options.markerEditorClass) ? map.options.markerEditorClass : L.Editable.MarkerEditor;
        }

    });

    L.Rectangle.include({

        getEditorClass: function (map) {
            return (map && map.options.rectangleEditorClass) ? map.options.rectangleEditorClass : L.Editable.RectangleEditor;
        }

    });

    L.Circle.include({

        getEditorClass: function (map) {
            return (map && map.options.circleEditorClass) ? map.options.circleEditorClass : L.Editable.CircleEditor;
        }

    });

    var keepEditable = function () {
        // Make sure you can remove/readd an editable layer.
        this.on('add', this._onEditableAdd);
    };
    L.Marker.addInitHook(keepEditable);
    L.Polyline.addInitHook(keepEditable);

    L.LatLng.prototype.update = function (latlng) {
        this.lat = latlng.lat;
        this.lng = latlng.lng;
    }

}, window));

},{"leaflet":4}],4:[function(require,module,exports){
/*
 Leaflet 1.0.0-beta.2 (55fe462), a JS library for interactive maps. http://leafletjs.com
 (c) 2010-2015 Vladimir Agafonkin, (c) 2010-2011 CloudMade
*/
(function (window, document, undefined) {
var L = {
	version: '1.0.0-beta.2'
};

function expose() {
	var oldL = window.L;

	L.noConflict = function () {
		window.L = oldL;
		return this;
	};

	window.L = L;
}

// define Leaflet for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = L;

// define Leaflet as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(L);
}

// define Leaflet as a global L variable, saving the original L to restore later if needed
if (typeof window !== 'undefined') {
	expose();
}



/*
 * L.Util contains various utility functions used throughout Leaflet code.
 */

L.Util = {
	// extend an object with properties of one or more other objects
	extend: function (dest) {
		var i, j, len, src;

		for (j = 1, len = arguments.length; j < len; j++) {
			src = arguments[j];
			for (i in src) {
				dest[i] = src[i];
			}
		}
		return dest;
	},

	// create an object from a given prototype
	create: Object.create || (function () {
		function F() {}
		return function (proto) {
			F.prototype = proto;
			return new F();
		};
	})(),

	// bind a function to be called with a given context
	bind: function (fn, obj) {
		var slice = Array.prototype.slice;

		if (fn.bind) {
			return fn.bind.apply(fn, slice.call(arguments, 1));
		}

		var args = slice.call(arguments, 2);

		return function () {
			return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
		};
	},

	// return unique ID of an object
	stamp: function (obj) {
		/*eslint-disable */
		obj._leaflet_id = obj._leaflet_id || ++L.Util.lastId;
		return obj._leaflet_id;
		/*eslint-enable */
	},

	lastId: 0,

	// return a function that won't be called more often than the given interval
	throttle: function (fn, time, context) {
		var lock, args, wrapperFn, later;

		later = function () {
			// reset lock and call if queued
			lock = false;
			if (args) {
				wrapperFn.apply(context, args);
				args = false;
			}
		};

		wrapperFn = function () {
			if (lock) {
				// called too soon, queue to call later
				args = arguments;

			} else {
				// call and lock until later
				fn.apply(context, arguments);
				setTimeout(later, time);
				lock = true;
			}
		};

		return wrapperFn;
	},

	// wrap the given number to lie within a certain range (used for wrapping longitude)
	wrapNum: function (x, range, includeMax) {
		var max = range[1],
		    min = range[0],
		    d = max - min;
		return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
	},

	// do nothing (used as a noop throughout the code)
	falseFn: function () { return false; },

	// round a given number to a given precision
	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	// trim whitespace from both sides of a string
	trim: function (str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	},

	// split a string into words
	splitWords: function (str) {
		return L.Util.trim(str).split(/\s+/);
	},

	// set options to an object, inheriting parent's options as well
	setOptions: function (obj, options) {
		if (!obj.hasOwnProperty('options')) {
			obj.options = obj.options ? L.Util.create(obj.options) : {};
		}
		for (var i in options) {
			obj.options[i] = options[i];
		}
		return obj.options;
	},

	// make a URL with GET parameters out of a set of properties/values
	getParamString: function (obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	},

	// super-simple templating facility, used for TileLayer URLs
	template: function (str, data) {
		return str.replace(L.Util.templateRe, function (str, key) {
			var value = data[key];

			if (value === undefined) {
				throw new Error('No value provided for variable ' + str);

			} else if (typeof value === 'function') {
				value = value(data);
			}
			return value;
		});
	},

	templateRe: /\{ *([\w_]+) *\}/g,

	isArray: Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	},

	indexOf: function (array, el) {
		for (var i = 0; i < array.length; i++) {
			if (array[i] === el) { return i; }
		}
		return -1;
	},

	// minimal image URI, set to an image when disposing to flush memory
	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {
	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		return window['webkit' + name] || window['moz' + name] || window['ms' + name];
	}

	var lastTime = 0;

	// fallback for IE 7-8
	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame || getPrefixed('RequestAnimationFrame') || timeoutDefer,
	    cancelFn = window.cancelAnimationFrame || getPrefixed('CancelAnimationFrame') ||
	               getPrefixed('CancelRequestAnimationFrame') || function (id) { window.clearTimeout(id); };


	L.Util.requestAnimFrame = function (fn, context, immediate) {
		if (immediate && requestFn === timeoutDefer) {
			fn.call(context);
		} else {
			return requestFn.call(window, L.bind(fn, context));
		}
	};

	L.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};
})();

// shortcuts for most used utility functions
L.extend = L.Util.extend;
L.bind = L.Util.bind;
L.stamp = L.Util.stamp;
L.setOptions = L.Util.setOptions;



/*
 * L.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */

L.Class = function () {};

L.Class.extend = function (props) {

	// extended class with the new prototype
	var NewClass = function () {

		// call the constructor
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}

		// call all constructor hooks
		this.callInitHooks();
	};

	var parentProto = NewClass.__super__ = this.prototype;

	var proto = L.Util.create(parentProto);
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	// inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		L.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		L.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (proto.options) {
		props.options = L.Util.extend(L.Util.create(proto.options), props.options);
	}

	// mix given properties into the prototype
	L.extend(proto, props);

	proto._initHooks = [];

	// add method for calling all hooks
	proto.callInitHooks = function () {

		if (this._initHooksCalled) { return; }

		if (parentProto.callInitHooks) {
			parentProto.callInitHooks.call(this);
		}

		this._initHooksCalled = true;

		for (var i = 0, len = proto._initHooks.length; i < len; i++) {
			proto._initHooks[i].call(this);
		}
	};

	return NewClass;
};


// method for adding properties to prototype
L.Class.include = function (props) {
	L.extend(this.prototype, props);
};

// merge new default options to the Class
L.Class.mergeOptions = function (options) {
	L.extend(this.prototype.options, options);
};

// add a constructor hook
L.Class.addInitHook = function (fn) { // (Function) || (String, args...)
	var args = Array.prototype.slice.call(arguments, 1);

	var init = typeof fn === 'function' ? fn : function () {
		this[fn].apply(this, args);
	};

	this.prototype._initHooks = this.prototype._initHooks || [];
	this.prototype._initHooks.push(init);
};



/*
 * L.Evented is a base class that Leaflet classes inherit from to handle custom events.
 */

L.Evented = L.Class.extend({

	on: function (types, fn, context) {

		// types can be a map of types/handlers
		if (typeof types === 'object') {
			for (var type in types) {
				// we don't process space-separated events here for performance;
				// it's a hot path since Layer uses the on(obj) syntax
				this._on(type, types[type], fn);
			}

		} else {
			// types can be a string of space-separated words
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(types[i], fn, context);
			}
		}

		return this;
	},

	off: function (types, fn, context) {

		if (!types) {
			// clear all listeners if called without arguments
			delete this._events;

		} else if (typeof types === 'object') {
			for (var type in types) {
				this._off(type, types[type], fn);
			}

		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(types[i], fn, context);
			}
		}

		return this;
	},

	// attach listener (without syntactic sugar now)
	_on: function (type, fn, context) {

		var events = this._events = this._events || {},
		    contextId = context && context !== this && L.stamp(context);

		if (contextId) {
			// store listeners with custom context in a separate hash (if it has an id);
			// gives a major performance boost when firing and removing events (e.g. on map object)

			var indexKey = type + '_idx',
			    indexLenKey = type + '_len',
			    typeIndex = events[indexKey] = events[indexKey] || {},
			    id = L.stamp(fn) + '_' + contextId;

			if (!typeIndex[id]) {
				typeIndex[id] = {fn: fn, ctx: context};

				// keep track of the number of keys in the index to quickly check if it's empty
				events[indexLenKey] = (events[indexLenKey] || 0) + 1;
			}

		} else {
			// individual layers mostly use "this" for context and don't fire listeners too often
			// so simple array makes the memory footprint better while not degrading performance

			events[type] = events[type] || [];
			events[type].push({fn: fn});
		}
	},

	_off: function (type, fn, context) {
		var events = this._events,
		    indexKey = type + '_idx',
		    indexLenKey = type + '_len';

		if (!events) { return; }

		if (!fn) {
			// clear all listeners for a type if function isn't specified
			delete events[type];
			delete events[indexKey];
			delete events[indexLenKey];
			return;
		}

		var contextId = context && context !== this && L.stamp(context),
		    listeners, i, len, listener, id;

		if (contextId) {
			id = L.stamp(fn) + '_' + contextId;
			listeners = events[indexKey];

			if (listeners && listeners[id]) {
				listener = listeners[id];
				delete listeners[id];
				events[indexLenKey]--;
			}

		} else {
			listeners = events[type];

			if (listeners) {
				for (i = 0, len = listeners.length; i < len; i++) {
					if (listeners[i].fn === fn) {
						listener = listeners[i];
						listeners.splice(i, 1);
						break;
					}
				}
			}
		}

		// set the removed listener to noop so that's not called if remove happens in fire
		if (listener) {
			listener.fn = L.Util.falseFn;
		}
	},

	fire: function (type, data, propagate) {
		if (!this.listens(type, propagate)) { return this; }

		var event = L.Util.extend({}, data, {type: type, target: this}),
		    events = this._events;

		if (events) {
			var typeIndex = events[type + '_idx'],
			    i, len, listeners, id;

			if (events[type]) {
				// make sure adding/removing listeners inside other listeners won't cause infinite loop
				listeners = events[type].slice();

				for (i = 0, len = listeners.length; i < len; i++) {
					listeners[i].fn.call(this, event);
				}
			}

			// fire event for the context-indexed listeners as well
			for (id in typeIndex) {
				typeIndex[id].fn.call(typeIndex[id].ctx, event);
			}
		}

		if (propagate) {
			// propagate the event to parents (set with addEventParent)
			this._propagateEvent(event);
		}

		return this;
	},

	listens: function (type, propagate) {
		var events = this._events;

		if (events && (events[type] || events[type + '_len'])) { return true; }

		if (propagate) {
			// also check parents for listeners if event propagates
			for (var id in this._eventParents) {
				if (this._eventParents[id].listens(type, propagate)) { return true; }
			}
		}
		return false;
	},

	once: function (types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this.once(type, types[type], fn);
			}
			return this;
		}

		var handler = L.bind(function () {
			this
			    .off(types, fn, context)
			    .off(types, handler, context);
		}, this);

		// add a listener that's executed once and removed after that
		return this
		    .on(types, fn, context)
		    .on(types, handler, context);
	},

	// adds a parent to propagate events to (when you fire with true as a 3rd argument)
	addEventParent: function (obj) {
		this._eventParents = this._eventParents || {};
		this._eventParents[L.stamp(obj)] = obj;
		return this;
	},

	removeEventParent: function (obj) {
		if (this._eventParents) {
			delete this._eventParents[L.stamp(obj)];
		}
		return this;
	},

	_propagateEvent: function (e) {
		for (var id in this._eventParents) {
			this._eventParents[id].fire(e.type, L.extend({layer: e.target}, e), true);
		}
	}
});

var proto = L.Evented.prototype;

// aliases; we should ditch those eventually
proto.addEventListener = proto.on;
proto.removeEventListener = proto.clearAllEventListeners = proto.off;
proto.addOneTimeEventListener = proto.once;
proto.fireEvent = proto.fire;
proto.hasEventListeners = proto.listens;

L.Mixin = {Events: proto};



/*
 * L.Browser handles different browser and feature detections for internal Leaflet use.
 */

(function () {

	var ua = navigator.userAgent.toLowerCase(),
	    doc = document.documentElement,

	    ie = 'ActiveXObject' in window,

	    webkit    = ua.indexOf('webkit') !== -1,
	    phantomjs = ua.indexOf('phantom') !== -1,
	    android23 = ua.search('android [23]') !== -1,
	    chrome    = ua.indexOf('chrome') !== -1,
	    gecko     = ua.indexOf('gecko') !== -1  && !webkit && !window.opera && !ie,

	    mobile = typeof orientation !== 'undefined' || ua.indexOf('mobile') !== -1,
	    msPointer = !window.PointerEvent && window.MSPointerEvent,
	    pointer = (window.PointerEvent && navigator.pointerEnabled) || msPointer,

	    ie3d = ie && ('transition' in doc.style),
	    webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
	    gecko3d = 'MozPerspective' in doc.style,
	    opera12 = 'OTransition' in doc.style;

	var touch = !window.L_NO_TOUCH && !phantomjs && (pointer || 'ontouchstart' in window ||
			(window.DocumentTouch && document instanceof window.DocumentTouch));

	L.Browser = {
		ie: ie,
		ielt9: ie && !document.addEventListener,
		webkit: webkit,
		gecko: gecko,
		android: ua.indexOf('android') !== -1,
		android23: android23,
		chrome: chrome,
		safari: !chrome && ua.indexOf('safari') !== -1,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera12: opera12,
		any3d: !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantomjs,

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && window.opera,
		mobileGecko: mobile && gecko,

		touch: !!touch,
		msPointer: !!msPointer,
		pointer: !!pointer,

		retina: (window.devicePixelRatio || (window.screen.deviceXDPI / window.screen.logicalXDPI)) > 1
	};

}());



/*
 * L.Point represents a point with x and y coordinates.
 */

L.Point = function (x, y, round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

L.Point.prototype = {

	clone: function () {
		return new L.Point(this.x, this.y);
	},

	// non-destructive, returns a new point
	add: function (point) {
		return this.clone()._add(L.point(point));
	},

	// destructive, used directly for performance in situations where it's safe to modify existing point
	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(L.point(point));
	},

	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num) {
		return this.clone()._divideBy(num);
	},

	_divideBy: function (num) {
		this.x /= num;
		this.y /= num;
		return this;
	},

	multiplyBy: function (num) {
		return this.clone()._multiplyBy(num);
	},

	_multiplyBy: function (num) {
		this.x *= num;
		this.y *= num;
		return this;
	},

	scaleBy: function (point) {
		return new L.Point(this.x * point.x, this.y * point.y);
	},

	unscaleBy: function (point) {
		return new L.Point(this.x / point.x, this.y / point.y);
	},

	round: function () {
		return this.clone()._round();
	},

	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	ceil: function () {
		return this.clone()._ceil();
	},

	_ceil: function () {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	},

	distanceTo: function (point) {
		point = L.point(point);

		var x = point.x - this.x,
		    y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	equals: function (point) {
		point = L.point(point);

		return point.x === this.x &&
		       point.y === this.y;
	},

	contains: function (point) {
		point = L.point(point);

		return Math.abs(point.x) <= Math.abs(this.x) &&
		       Math.abs(point.y) <= Math.abs(this.y);
	},

	toString: function () {
		return 'Point(' +
		        L.Util.formatNum(this.x) + ', ' +
		        L.Util.formatNum(this.y) + ')';
	}
};

L.point = function (x, y, round) {
	if (x instanceof L.Point) {
		return x;
	}
	if (L.Util.isArray(x)) {
		return new L.Point(x[0], x[1]);
	}
	if (x === undefined || x === null) {
		return x;
	}
	return new L.Point(x, y, round);
};



/*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

L.Bounds = function (a, b) { // (Point, Point) or Point[]
	if (!a) { return; }

	var points = b ? [a, b] : a;

	for (var i = 0, len = points.length; i < len; i++) {
		this.extend(points[i]);
	}
};

L.Bounds.prototype = {
	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = L.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new L.Point(
		        (this.min.x + this.max.x) / 2,
		        (this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new L.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new L.Point(this.max.x, this.min.y);
	},

	getSize: function () {
		return this.max.subtract(this.min);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof L.Point) {
			obj = L.point(obj);
		} else {
			obj = L.bounds(obj);
		}

		if (obj instanceof L.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
		       (max.x <= this.max.x) &&
		       (min.y >= this.min.y) &&
		       (max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
		    yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	},

	overlaps: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xOverlaps = (max2.x > min.x) && (min2.x < max.x),
		    yOverlaps = (max2.y > min.y) && (min2.y < max.y);

		return xOverlaps && yOverlaps;
	},

	isValid: function () {
		return !!(this.min && this.max);
	}
};

L.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof L.Bounds) {
		return a;
	}
	return new L.Bounds(a, b);
};



/*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

L.Transformation = function (a, b, c, d) {
	this._a = a;
	this._b = b;
	this._c = c;
	this._d = d;
};

L.Transformation.prototype = {
	transform: function (point, scale) { // (Point, Number) -> Point
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (point, scale) {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (point, scale) {
		scale = scale || 1;
		return new L.Point(
		        (point.x / scale - this._b) / this._a,
		        (point.y / scale - this._d) / this._c);
	}
};



/*
 * L.DomUtil contains various utility functions for working with DOM.
 */

L.DomUtil = {
	get: function (id) {
		return typeof id === 'string' ? document.getElementById(id) : id;
	},

	getStyle: function (el, style) {

		var value = el.style[style] || (el.currentStyle && el.currentStyle[style]);

		if ((!value || value === 'auto') && document.defaultView) {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}

		return value === 'auto' ? null : value;
	},

	create: function (tagName, className, container) {

		var el = document.createElement(tagName);
		el.className = className;

		if (container) {
			container.appendChild(el);
		}

		return el;
	},

	remove: function (el) {
		var parent = el.parentNode;
		if (parent) {
			parent.removeChild(el);
		}
	},

	empty: function (el) {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	},

	toFront: function (el) {
		el.parentNode.appendChild(el);
	},

	toBack: function (el) {
		var parent = el.parentNode;
		parent.insertBefore(el, parent.firstChild);
	},

	hasClass: function (el, name) {
		if (el.classList !== undefined) {
			return el.classList.contains(name);
		}
		var className = L.DomUtil.getClass(el);
		return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
	},

	addClass: function (el, name) {
		if (el.classList !== undefined) {
			var classes = L.Util.splitWords(name);
			for (var i = 0, len = classes.length; i < len; i++) {
				el.classList.add(classes[i]);
			}
		} else if (!L.DomUtil.hasClass(el, name)) {
			var className = L.DomUtil.getClass(el);
			L.DomUtil.setClass(el, (className ? className + ' ' : '') + name);
		}
	},

	removeClass: function (el, name) {
		if (el.classList !== undefined) {
			el.classList.remove(name);
		} else {
			L.DomUtil.setClass(el, L.Util.trim((' ' + L.DomUtil.getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
		}
	},

	setClass: function (el, name) {
		if (el.className.baseVal === undefined) {
			el.className = name;
		} else {
			// in case of SVG element
			el.className.baseVal = name;
		}
	},

	getClass: function (el) {
		return el.className.baseVal === undefined ? el.className : el.className.baseVal;
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if ('filter' in el.style) {
			L.DomUtil._setOpacityIE(el, value);
		}
	},

	_setOpacityIE: function (el, value) {
		var filter = false,
		    filterName = 'DXImageTransform.Microsoft.Alpha';

		// filters collection throws an error if we try to retrieve a filter that doesn't exist
		try {
			filter = el.filters.item(filterName);
		} catch (e) {
			// don't set opacity to 1 if we haven't already set an opacity,
			// it isn't needed and breaks transparent pngs.
			if (value === 1) { return; }
		}

		value = Math.round(value * 100);

		if (filter) {
			filter.Enabled = (value !== 100);
			filter.Opacity = value;
		} else {
			el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
		}
	},

	testProp: function (props) {

		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	setTransform: function (el, offset, scale) {
		var pos = offset || new L.Point(0, 0);

		el.style[L.DomUtil.TRANSFORM] =
			(L.Browser.ie3d ?
				'translate(' + pos.x + 'px,' + pos.y + 'px)' :
				'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
			(scale ? ' scale(' + scale + ')' : '');
	},

	setPosition: function (el, point) { // (HTMLElement, Point[, Boolean])

		/*eslint-disable */
		el._leaflet_pos = point;
		/*eslint-enable */

		if (L.Browser.any3d) {
			L.DomUtil.setTransform(el, point);
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		// this method is only used for elements previously positioned using setPosition,
		// so it's safe to cache the position for performance

		return el._leaflet_pos;
	}
};


(function () {
	// prefix style property names

	L.DomUtil.TRANSFORM = L.DomUtil.testProp(
			['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);


	// webkitTransition comes first because some browser versions that drop vendor prefix don't do
	// the same for the transitionend event, in particular the Android 4.1 stock browser

	var transition = L.DomUtil.TRANSITION = L.DomUtil.testProp(
			['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

	L.DomUtil.TRANSITION_END =
			transition === 'webkitTransition' || transition === 'OTransition' ? transition + 'End' : 'transitionend';


	if ('onselectstart' in document) {
		L.DomUtil.disableTextSelection = function () {
			L.DomEvent.on(window, 'selectstart', L.DomEvent.preventDefault);
		};
		L.DomUtil.enableTextSelection = function () {
			L.DomEvent.off(window, 'selectstart', L.DomEvent.preventDefault);
		};

	} else {
		var userSelectProperty = L.DomUtil.testProp(
			['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);

		L.DomUtil.disableTextSelection = function () {
			if (userSelectProperty) {
				var style = document.documentElement.style;
				this._userSelect = style[userSelectProperty];
				style[userSelectProperty] = 'none';
			}
		};
		L.DomUtil.enableTextSelection = function () {
			if (userSelectProperty) {
				document.documentElement.style[userSelectProperty] = this._userSelect;
				delete this._userSelect;
			}
		};
	}

	L.DomUtil.disableImageDrag = function () {
		L.DomEvent.on(window, 'dragstart', L.DomEvent.preventDefault);
	};
	L.DomUtil.enableImageDrag = function () {
		L.DomEvent.off(window, 'dragstart', L.DomEvent.preventDefault);
	};

	L.DomUtil.preventOutline = function (element) {
		while (element.tabIndex === -1) {
			element = element.parentNode;
		}
		if (!element || !element.style) { return; }
		L.DomUtil.restoreOutline();
		this._outlineElement = element;
		this._outlineStyle = element.style.outline;
		element.style.outline = 'none';
		L.DomEvent.on(window, 'keydown', L.DomUtil.restoreOutline, this);
	};
	L.DomUtil.restoreOutline = function () {
		if (!this._outlineElement) { return; }
		this._outlineElement.style.outline = this._outlineStyle;
		delete this._outlineElement;
		delete this._outlineStyle;
		L.DomEvent.off(window, 'keydown', L.DomUtil.restoreOutline, this);
	};
})();



/*
 * L.LatLng represents a geographical point with latitude and longitude coordinates.
 */

L.LatLng = function (lat, lng, alt) {
	if (isNaN(lat) || isNaN(lng)) {
		throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
	}

	this.lat = +lat;
	this.lng = +lng;

	if (alt !== undefined) {
		this.alt = +alt;
	}
};

L.LatLng.prototype = {
	equals: function (obj, maxMargin) {
		if (!obj) { return false; }

		obj = L.latLng(obj);

		var margin = Math.max(
		        Math.abs(this.lat - obj.lat),
		        Math.abs(this.lng - obj.lng));

		return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
	},

	toString: function (precision) {
		return 'LatLng(' +
		        L.Util.formatNum(this.lat, precision) + ', ' +
		        L.Util.formatNum(this.lng, precision) + ')';
	},

	distanceTo: function (other) {
		return L.CRS.Earth.distance(this, L.latLng(other));
	},

	wrap: function () {
		return L.CRS.Earth.wrapLatLng(this);
	},

	toBounds: function (sizeInMeters) {
		var latAccuracy = 180 * sizeInMeters / 40075017,
		    lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

		return L.latLngBounds(
		        [this.lat - latAccuracy, this.lng - lngAccuracy],
		        [this.lat + latAccuracy, this.lng + lngAccuracy]);
	},

	clone: function () {
		return new L.LatLng(this.lat, this.lng, this.alt);
	}
};


// constructs LatLng with different signatures
// (LatLng) or ([Number, Number]) or (Number, Number) or (Object)

L.latLng = function (a, b, c) {
	if (a instanceof L.LatLng) {
		return a;
	}
	if (L.Util.isArray(a) && typeof a[0] !== 'object') {
		if (a.length === 3) {
			return new L.LatLng(a[0], a[1], a[2]);
		}
		if (a.length === 2) {
			return new L.LatLng(a[0], a[1]);
		}
		return null;
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new L.LatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
	}
	if (b === undefined) {
		return null;
	}
	return new L.LatLng(a, b, c);
};



/*
 * L.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */

L.LatLngBounds = function (southWest, northEast) { // (LatLng, LatLng) or (LatLng[])
	if (!southWest) { return; }

	var latlngs = northEast ? [southWest, northEast] : southWest;

	for (var i = 0, len = latlngs.length; i < len; i++) {
		this.extend(latlngs[i]);
	}
};

L.LatLngBounds.prototype = {

	// extend the bounds to contain the given point or bounds
	extend: function (obj) { // (LatLng) or (LatLngBounds)
		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof L.LatLng) {
			sw2 = obj;
			ne2 = obj;

		} else if (obj instanceof L.LatLngBounds) {
			sw2 = obj._southWest;
			ne2 = obj._northEast;

			if (!sw2 || !ne2) { return this; }

		} else {
			return obj ? this.extend(L.latLng(obj) || L.latLngBounds(obj)) : this;
		}

		if (!sw && !ne) {
			this._southWest = new L.LatLng(sw2.lat, sw2.lng);
			this._northEast = new L.LatLng(ne2.lat, ne2.lng);
		} else {
			sw.lat = Math.min(sw2.lat, sw.lat);
			sw.lng = Math.min(sw2.lng, sw.lng);
			ne.lat = Math.max(ne2.lat, ne.lat);
			ne.lng = Math.max(ne2.lng, ne.lng);
		}

		return this;
	},

	// extend the bounds by a percentage
	pad: function (bufferRatio) { // (Number) -> LatLngBounds
		var sw = this._southWest,
		    ne = this._northEast,
		    heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
		    widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

		return new L.LatLngBounds(
		        new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
		        new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
	},

	getCenter: function () { // -> LatLng
		return new L.LatLng(
		        (this._southWest.lat + this._northEast.lat) / 2,
		        (this._southWest.lng + this._northEast.lng) / 2);
	},

	getSouthWest: function () {
		return this._southWest;
	},

	getNorthEast: function () {
		return this._northEast;
	},

	getNorthWest: function () {
		return new L.LatLng(this.getNorth(), this.getWest());
	},

	getSouthEast: function () {
		return new L.LatLng(this.getSouth(), this.getEast());
	},

	getWest: function () {
		return this._southWest.lng;
	},

	getSouth: function () {
		return this._southWest.lat;
	},

	getEast: function () {
		return this._northEast.lng;
	},

	getNorth: function () {
		return this._northEast.lat;
	},

	contains: function (obj) { // (LatLngBounds) or (LatLng) -> Boolean
		if (typeof obj[0] === 'number' || obj instanceof L.LatLng) {
			obj = L.latLng(obj);
		} else {
			obj = L.latLngBounds(obj);
		}

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof L.LatLngBounds) {
			sw2 = obj.getSouthWest();
			ne2 = obj.getNorthEast();
		} else {
			sw2 = ne2 = obj;
		}

		return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
		       (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	},

	intersects: function (bounds) { // (LatLngBounds) -> Boolean
		bounds = L.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
		    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

		return latIntersects && lngIntersects;
	},

	overlaps: function (bounds) { // (LatLngBounds) -> Boolean
		bounds = L.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latOverlaps = (ne2.lat > sw.lat) && (sw2.lat < ne.lat),
		    lngOverlaps = (ne2.lng > sw.lng) && (sw2.lng < ne.lng);

		return latOverlaps && lngOverlaps;
	},

	toBBoxString: function () {
		return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	},

	equals: function (bounds) { // (LatLngBounds)
		if (!bounds) { return false; }

		bounds = L.latLngBounds(bounds);

		return this._southWest.equals(bounds.getSouthWest()) &&
		       this._northEast.equals(bounds.getNorthEast());
	},

	isValid: function () {
		return !!(this._southWest && this._northEast);
	}
};

// TODO International date line?

L.latLngBounds = function (a, b) { // (LatLngBounds) or (LatLng, LatLng)
	if (!a || a instanceof L.LatLngBounds) {
		return a;
	}
	return new L.LatLngBounds(a, b);
};



/*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */

L.Projection = {};

L.Projection.LonLat = {
	project: function (latlng) {
		return new L.Point(latlng.lng, latlng.lat);
	},

	unproject: function (point) {
		return new L.LatLng(point.y, point.x);
	},

	bounds: L.bounds([-180, -90], [180, 90])
};



/*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */

L.Projection.SphericalMercator = {

	R: 6378137,
	MAX_LATITUDE: 85.0511287798,

	project: function (latlng) {
		var d = Math.PI / 180,
		    max = this.MAX_LATITUDE,
		    lat = Math.max(Math.min(max, latlng.lat), -max),
		    sin = Math.sin(lat * d);

		return new L.Point(
				this.R * latlng.lng * d,
				this.R * Math.log((1 + sin) / (1 - sin)) / 2);
	},

	unproject: function (point) {
		var d = 180 / Math.PI;

		return new L.LatLng(
			(2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d,
			point.x * d / this.R);
	},

	bounds: (function () {
		var d = 6378137 * Math.PI;
		return L.bounds([-d, -d], [d, d]);
	})()
};



/*
 * L.CRS is the base object for all defined CRS (Coordinate Reference Systems) in Leaflet.
 */

L.CRS = {
	// converts geo coords to pixel ones
	latLngToPoint: function (latlng, zoom) {
		var projectedPoint = this.projection.project(latlng),
		    scale = this.scale(zoom);

		return this.transformation._transform(projectedPoint, scale);
	},

	// converts pixel coords to geo coords
	pointToLatLng: function (point, zoom) {
		var scale = this.scale(zoom),
		    untransformedPoint = this.transformation.untransform(point, scale);

		return this.projection.unproject(untransformedPoint);
	},

	// converts geo coords to projection-specific coords (e.g. in meters)
	project: function (latlng) {
		return this.projection.project(latlng);
	},

	// converts projected coords to geo coords
	unproject: function (point) {
		return this.projection.unproject(point);
	},

	// defines how the world scales with zoom
	scale: function (zoom) {
		return 256 * Math.pow(2, zoom);
	},

	zoom: function (scale) {
		return Math.log(scale / 256) / Math.LN2;
	},

	// returns the bounds of the world in projected coords if applicable
	getProjectedBounds: function (zoom) {
		if (this.infinite) { return null; }

		var b = this.projection.bounds,
		    s = this.scale(zoom),
		    min = this.transformation.transform(b.min, s),
		    max = this.transformation.transform(b.max, s);

		return L.bounds(min, max);
	},

	// whether a coordinate axis wraps in a given range (e.g. longitude from -180 to 180); depends on CRS
	// wrapLng: [min, max],
	// wrapLat: [min, max],

	// if true, the coordinate space will be unbounded (infinite in all directions)
	// infinite: false,

	// wraps geo coords in certain ranges if applicable
	wrapLatLng: function (latlng) {
		var lng = this.wrapLng ? L.Util.wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
		    lat = this.wrapLat ? L.Util.wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat,
		    alt = latlng.alt;

		return L.latLng(lat, lng, alt);
	}
};



/*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */

L.CRS.Simple = L.extend({}, L.CRS, {
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1, 0, -1, 0),

	scale: function (zoom) {
		return Math.pow(2, zoom);
	},

	zoom: function (scale) {
		return Math.log(scale) / Math.LN2;
	},

	distance: function (latlng1, latlng2) {
		var dx = latlng2.lng - latlng1.lng,
		    dy = latlng2.lat - latlng1.lat;

		return Math.sqrt(dx * dx + dy * dy);
	},

	infinite: true
});



/*
 * L.CRS.Earth is the base class for all CRS representing Earth.
 */

L.CRS.Earth = L.extend({}, L.CRS, {
	wrapLng: [-180, 180],

	R: 6378137,

	// distance between two geographical points using spherical law of cosines approximation
	distance: function (latlng1, latlng2) {
		var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad,
		    a = Math.sin(lat1) * Math.sin(lat2) +
		        Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);

		return this.R * Math.acos(Math.min(a, 1));
	}
});



/*
 * L.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping and is used by Leaflet by default.
 */

L.CRS.EPSG3857 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:3857',
	projection: L.Projection.SphericalMercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * L.Projection.SphericalMercator.R);
		return new L.Transformation(scale, 0.5, -scale, 0.5);
	}())
});

L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
	code: 'EPSG:900913'
});



/*
 * L.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */

L.CRS.EPSG4326 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:4326',
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1 / 180, 1, -1 / 180, 0.5)
});



/*
 * L.Map is the central class of the API - it is used to create a map.
 */

L.Map = L.Evented.extend({

	options: {
		crs: L.CRS.EPSG3857,

		/*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/

		fadeAnimation: true,
		trackResize: true,
		markerZoomAnimation: true,
		maxBoundsViscosity: 0.0,
		transform3DLimit: 8388608 // Precision limit of a 32-bit float
	},

	initialize: function (id, options) { // (HTMLElement or String, Object)
		options = L.setOptions(this, options);

		this._initContainer(id);
		this._initLayout();

		// hack for https://github.com/Leaflet/Leaflet/issues/1980
		this._onResize = L.bind(this._onResize, this);

		this._initEvents();

		if (options.maxBounds) {
			this.setMaxBounds(options.maxBounds);
		}

		if (options.zoom !== undefined) {
			this._zoom = this._limitZoom(options.zoom);
		}

		if (options.center && options.zoom !== undefined) {
			this.setView(L.latLng(options.center), options.zoom, {reset: true});
		}

		this._handlers = [];
		this._layers = {};
		this._zoomBoundLayers = {};
		this._sizeChanged = true;

		this.callInitHooks();

		this._addLayers(this.options.layers);
	},


	// public methods that modify map state

	// replaced by animation-powered implementation in Map.PanAnimation.js
	setView: function (center, zoom) {
		zoom = zoom === undefined ? this.getZoom() : zoom;
		this._resetView(L.latLng(center), zoom);
		return this;
	},

	setZoom: function (zoom, options) {
		if (!this._loaded) {
			this._zoom = zoom;
			return this;
		}
		return this.setView(this.getCenter(), zoom, {zoom: options});
	},

	zoomIn: function (delta, options) {
		return this.setZoom(this._zoom + (delta || 1), options);
	},

	zoomOut: function (delta, options) {
		return this.setZoom(this._zoom - (delta || 1), options);
	},

	setZoomAround: function (latlng, zoom, options) {
		var scale = this.getZoomScale(zoom),
		    viewHalf = this.getSize().divideBy(2),
		    containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

		    centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
		    newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

		return this.setView(newCenter, zoom, {zoom: options});
	},

	_getBoundsCenterZoom: function (bounds, options) {

		options = options || {};
		bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);

		var paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
		    paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),

		    zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));

		zoom = options.maxZoom ? Math.min(options.maxZoom, zoom) : zoom;

		var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

		    swPoint = this.project(bounds.getSouthWest(), zoom),
		    nePoint = this.project(bounds.getNorthEast(), zoom),
		    center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

		return {
			center: center,
			zoom: zoom
		};
	},

	fitBounds: function (bounds, options) {
		var target = this._getBoundsCenterZoom(bounds, options);
		return this.setView(target.center, target.zoom, options);
	},

	fitWorld: function (options) {
		return this.fitBounds([[-90, -180], [90, 180]], options);
	},

	panTo: function (center, options) { // (LatLng)
		return this.setView(center, this._zoom, {pan: options});
	},

	panBy: function (offset) { // (Point)
		// replaced with animated panBy in Map.PanAnimation.js
		this.fire('movestart');

		this._rawPanBy(L.point(offset));

		this.fire('move');
		return this.fire('moveend');
	},

	setMaxBounds: function (bounds) {
		bounds = L.latLngBounds(bounds);

		if (!bounds) {
			return this.off('moveend', this._panInsideMaxBounds);
		} else if (this.options.maxBounds) {
			this.off('moveend', this._panInsideMaxBounds);
		}

		this.options.maxBounds = bounds;

		if (this._loaded) {
			this._panInsideMaxBounds();
		}

		return this.on('moveend', this._panInsideMaxBounds);
	},

	setMinZoom: function (zoom) {
		this.options.minZoom = zoom;

		if (this._loaded && this.getZoom() < this.options.minZoom) {
			return this.setZoom(zoom);
		}

		return this;
	},

	setMaxZoom: function (zoom) {
		this.options.maxZoom = zoom;

		if (this._loaded && (this.getZoom() > this.options.maxZoom)) {
			return this.setZoom(zoom);
		}

		return this;
	},

	panInsideBounds: function (bounds, options) {
		this._enforcingBounds = true;
		var center = this.getCenter(),
		    newCenter = this._limitCenter(center, this._zoom, L.latLngBounds(bounds));

		if (center.equals(newCenter)) { return this; }

		this.panTo(newCenter, options);
		this._enforcingBounds = false;
		return this;
	},

	invalidateSize: function (options) {
		if (!this._loaded) { return this; }

		options = L.extend({
			animate: false,
			pan: true
		}, options === true ? {animate: true} : options);

		var oldSize = this.getSize();
		this._sizeChanged = true;
		this._lastCenter = null;

		var newSize = this.getSize(),
		    oldCenter = oldSize.divideBy(2).round(),
		    newCenter = newSize.divideBy(2).round(),
		    offset = oldCenter.subtract(newCenter);

		if (!offset.x && !offset.y) { return this; }

		if (options.animate && options.pan) {
			this.panBy(offset);

		} else {
			if (options.pan) {
				this._rawPanBy(offset);
			}

			this.fire('move');

			if (options.debounceMoveend) {
				clearTimeout(this._sizeTimer);
				this._sizeTimer = setTimeout(L.bind(this.fire, this, 'moveend'), 200);
			} else {
				this.fire('moveend');
			}
		}

		return this.fire('resize', {
			oldSize: oldSize,
			newSize: newSize
		});
	},

	stop: function () {
		L.Util.cancelAnimFrame(this._flyToFrame);
		if (this._panAnim) {
			this._panAnim.stop();
		}
		return this;
	},

	// TODO handler.addTo
	addHandler: function (name, HandlerClass) {
		if (!HandlerClass) { return this; }

		var handler = this[name] = new HandlerClass(this);

		this._handlers.push(handler);

		if (this.options[name]) {
			handler.enable();
		}

		return this;
	},

	remove: function () {

		this._initEvents(true);

		try {
			// throws error in IE6-8
			delete this._container._leaflet;
		} catch (e) {
			this._container._leaflet = undefined;
		}

		L.DomUtil.remove(this._mapPane);

		if (this._clearControlPos) {
			this._clearControlPos();
		}

		this._clearHandlers();

		if (this._loaded) {
			this.fire('unload');
		}

		for (var i in this._layers) {
			this._layers[i].remove();
		}

		return this;
	},

	createPane: function (name, container) {
		var className = 'leaflet-pane' + (name ? ' leaflet-' + name.replace('Pane', '') + '-pane' : ''),
		    pane = L.DomUtil.create('div', className, container || this._mapPane);

		if (name) {
			this._panes[name] = pane;
		}
		return pane;
	},


	// public methods for getting map state

	getCenter: function () { // (Boolean) -> LatLng
		this._checkIfLoaded();

		if (this._lastCenter && !this._moved()) {
			return this._lastCenter;
		}
		return this.layerPointToLatLng(this._getCenterLayerPoint());
	},

	getZoom: function () {
		return this._zoom;
	},

	getBounds: function () {
		var bounds = this.getPixelBounds(),
		    sw = this.unproject(bounds.getBottomLeft()),
		    ne = this.unproject(bounds.getTopRight());

		return new L.LatLngBounds(sw, ne);
	},

	getMinZoom: function () {
		return this.options.minZoom === undefined ? this._layersMinZoom || 0 : this.options.minZoom;
	},

	getMaxZoom: function () {
		return this.options.maxZoom === undefined ?
			(this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom) :
			this.options.maxZoom;
	},

	getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
		bounds = L.latLngBounds(bounds);

		var zoom = this.getMinZoom() - (inside ? 1 : 0),
		    maxZoom = this.getMaxZoom(),
		    size = this.getSize(),

		    nw = bounds.getNorthWest(),
		    se = bounds.getSouthEast(),

		    zoomNotFound = true,
		    boundsSize;

		padding = L.point(padding || [0, 0]);

		do {
			zoom++;
			boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding).floor();
			zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

		} while (zoomNotFound && zoom <= maxZoom);

		if (zoomNotFound && inside) {
			return null;
		}

		return inside ? zoom : zoom - 1;
	},

	getSize: function () {
		if (!this._size || this._sizeChanged) {
			this._size = new L.Point(
				this._container.clientWidth,
				this._container.clientHeight);

			this._sizeChanged = false;
		}
		return this._size.clone();
	},

	getPixelBounds: function (center, zoom) {
		var topLeftPoint = this._getTopLeftPoint(center, zoom);
		return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
	},

	getPixelOrigin: function () {
		this._checkIfLoaded();
		return this._pixelOrigin;
	},

	getPixelWorldBounds: function (zoom) {
		return this.options.crs.getProjectedBounds(zoom === undefined ? this.getZoom() : zoom);
	},

	getPane: function (pane) {
		return typeof pane === 'string' ? this._panes[pane] : pane;
	},

	getPanes: function () {
		return this._panes;
	},

	getContainer: function () {
		return this._container;
	},


	// TODO replace with universal implementation after refactoring projections

	getZoomScale: function (toZoom, fromZoom) {
		var crs = this.options.crs;
		fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
		return crs.scale(toZoom) / crs.scale(fromZoom);
	},

	getScaleZoom: function (scale, fromZoom) {
		var crs = this.options.crs;
		fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
		return crs.zoom(scale * crs.scale(fromZoom));
	},

	// conversion methods

	project: function (latlng, zoom) { // (LatLng[, Number]) -> Point
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
	},

	unproject: function (point, zoom) { // (Point[, Number]) -> LatLng
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.pointToLatLng(L.point(point), zoom);
	},

	layerPointToLatLng: function (point) { // (Point)
		var projectedPoint = L.point(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint);
	},

	latLngToLayerPoint: function (latlng) { // (LatLng)
		var projectedPoint = this.project(L.latLng(latlng))._round();
		return projectedPoint._subtract(this.getPixelOrigin());
	},

	wrapLatLng: function (latlng) {
		return this.options.crs.wrapLatLng(L.latLng(latlng));
	},

	distance: function (latlng1, latlng2) {
		return this.options.crs.distance(L.latLng(latlng1), L.latLng(latlng2));
	},

	containerPointToLayerPoint: function (point) { // (Point)
		return L.point(point).subtract(this._getMapPanePos());
	},

	layerPointToContainerPoint: function (point) { // (Point)
		return L.point(point).add(this._getMapPanePos());
	},

	containerPointToLatLng: function (point) {
		var layerPoint = this.containerPointToLayerPoint(L.point(point));
		return this.layerPointToLatLng(layerPoint);
	},

	latLngToContainerPoint: function (latlng) {
		return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
	},

	mouseEventToContainerPoint: function (e) { // (MouseEvent)
		return L.DomEvent.getMousePosition(e, this._container);
	},

	mouseEventToLayerPoint: function (e) { // (MouseEvent)
		return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
	},

	mouseEventToLatLng: function (e) { // (MouseEvent)
		return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
	},


	// map initialization methods

	_initContainer: function (id) {
		var container = this._container = L.DomUtil.get(id);

		if (!container) {
			throw new Error('Map container not found.');
		} else if (container._leaflet) {
			throw new Error('Map container is already initialized.');
		}

		L.DomEvent.addListener(container, 'scroll', this._onScroll, this);
		container._leaflet = true;
	},

	_initLayout: function () {
		var container = this._container;

		this._fadeAnimated = this.options.fadeAnimation && L.Browser.any3d;

		L.DomUtil.addClass(container, 'leaflet-container' +
			(L.Browser.touch ? ' leaflet-touch' : '') +
			(L.Browser.retina ? ' leaflet-retina' : '') +
			(L.Browser.ielt9 ? ' leaflet-oldie' : '') +
			(L.Browser.safari ? ' leaflet-safari' : '') +
			(this._fadeAnimated ? ' leaflet-fade-anim' : ''));

		var position = L.DomUtil.getStyle(container, 'position');

		if (position !== 'absolute' && position !== 'relative' && position !== 'fixed') {
			container.style.position = 'relative';
		}

		this._initPanes();

		if (this._initControlPos) {
			this._initControlPos();
		}
	},

	_initPanes: function () {
		var panes = this._panes = {};
		this._paneRenderers = {};

		this._mapPane = this.createPane('mapPane', this._container);
		L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));

		this.createPane('tilePane');
		this.createPane('shadowPane');
		this.createPane('overlayPane');
		this.createPane('markerPane');
		this.createPane('popupPane');

		if (!this.options.markerZoomAnimation) {
			L.DomUtil.addClass(panes.markerPane, 'leaflet-zoom-hide');
			L.DomUtil.addClass(panes.shadowPane, 'leaflet-zoom-hide');
		}
	},


	// private methods that modify map state

	_resetView: function (center, zoom) {
		L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));

		var loading = !this._loaded;
		this._loaded = true;
		zoom = this._limitZoom(zoom);

		var zoomChanged = this._zoom !== zoom;
		this
			._moveStart(zoomChanged)
			._move(center, zoom)
			._moveEnd(zoomChanged);

		this.fire('viewreset');

		if (loading) {
			this.fire('load');
		}
	},

	_moveStart: function (zoomChanged) {
		if (zoomChanged) {
			this.fire('zoomstart');
		}
		return this.fire('movestart');
	},

	_move: function (center, zoom, data) {
		if (zoom === undefined) {
			zoom = this._zoom;
		}

		var zoomChanged = this._zoom !== zoom;

		this._zoom = zoom;
		this._lastCenter = center;
		this._pixelOrigin = this._getNewPixelOrigin(center);

		if (zoomChanged) {
			this.fire('zoom', data);
		}
		return this.fire('move', data);
	},

	_moveEnd: function (zoomChanged) {
		if (zoomChanged) {
			this.fire('zoomend');
		}
		return this.fire('moveend');
	},

	_rawPanBy: function (offset) {
		L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
	},

	_getZoomSpan: function () {
		return this.getMaxZoom() - this.getMinZoom();
	},

	_panInsideMaxBounds: function () {
		if (!this._enforcingBounds) {
			this.panInsideBounds(this.options.maxBounds);
		}
	},

	_checkIfLoaded: function () {
		if (!this._loaded) {
			throw new Error('Set map center and zoom first.');
		}
	},

	// DOM event handling

	_initEvents: function (remove) {
		if (!L.DomEvent) { return; }

		this._targets = {};
		this._targets[L.stamp(this._container)] = this;

		var onOff = remove ? 'off' : 'on';

		L.DomEvent[onOff](this._container, 'click dblclick mousedown mouseup ' +
			'mouseover mouseout mousemove contextmenu keypress', this._handleDOMEvent, this);

		if (this.options.trackResize) {
			L.DomEvent[onOff](window, 'resize', this._onResize, this);
		}

		if (L.Browser.any3d && this.options.transform3DLimit) {
			this[onOff]('moveend', this._onMoveEnd);
		}
	},

	_onResize: function () {
		L.Util.cancelAnimFrame(this._resizeRequest);
		this._resizeRequest = L.Util.requestAnimFrame(
		        function () { this.invalidateSize({debounceMoveend: true}); }, this);
	},

	_onScroll: function () {
		this._container.scrollTop  = 0;
		this._container.scrollLeft = 0;
	},

	_onMoveEnd: function () {
		var pos = this._getMapPanePos();
		if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) >= this.options.transform3DLimit) {
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1203873 but Webkit also have
			// a pixel offset on very high values, see: http://jsfiddle.net/dg6r5hhb/
			this._resetView(this.getCenter(), this.getZoom());
		}
	},

	_findEventTargets: function (e, type) {
		var targets = [],
		    target,
		    isHover = type === 'mouseout' || type === 'mouseover',
		    src = e.target || e.srcElement;

		while (src) {
			target = this._targets[L.stamp(src)];
			if (target && target.listens(type, true)) {
				if (isHover && !L.DomEvent._isExternalTarget(src, e)) { break; }
				targets.push(target);
				if (isHover) { break; }
			}
			if (src === this._container) { break; }
			src = src.parentNode;
		}
		if (!targets.length && !isHover && L.DomEvent._isExternalTarget(src, e)) {
			targets = [this];
		}
		return targets;
	},

	_handleDOMEvent: function (e) {
		if (!this._loaded || L.DomEvent._skipped(e)) { return; }

		// find the layer the event is propagating from and its parents
		var type = e.type === 'keypress' && e.keyCode === 13 ? 'click' : e.type;

		if (e.type === 'click') {
			// Fire a synthetic 'preclick' event which propagates up (mainly for closing popups).
			var synth = L.Util.extend({}, e);
			synth.type = 'preclick';
			this._handleDOMEvent(synth);
		}

		if (type === 'mousedown') {
			// prevents outline when clicking on keyboard-focusable element
			L.DomUtil.preventOutline(e.target || e.srcElement);
		}

		this._fireDOMEvent(e, type);
	},

	_fireDOMEvent: function (e, type, targets) {

		if (e._stopped) { return; }

		targets = (targets || []).concat(this._findEventTargets(e, type));

		if (!targets.length) { return; }

		var target = targets[0];
		if (type === 'contextmenu' && target.listens(type, true)) {
			L.DomEvent.preventDefault(e);
		}

		// prevents firing click after you just dragged an object
		if ((e.type === 'click' || e.type === 'preclick') && !e._simulated && this._draggableMoved(target)) { return; }

		var data = {
			originalEvent: e
		};

		if (e.type !== 'keypress') {
			var isMarker = target instanceof L.Marker;
			data.containerPoint = isMarker ?
					this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
			data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
			data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
		}

		for (var i = 0; i < targets.length; i++) {
			targets[i].fire(type, data, true);
			if (data.originalEvent._stopped ||
				(targets[i].options.nonBubblingEvents && L.Util.indexOf(targets[i].options.nonBubblingEvents, type) !== -1)) { return; }
		}
	},

	_draggableMoved: function (obj) {
		obj = obj.options.draggable ? obj : this;
		return (obj.dragging && obj.dragging.moved()) || (this.boxZoom && this.boxZoom.moved());
	},

	_clearHandlers: function () {
		for (var i = 0, len = this._handlers.length; i < len; i++) {
			this._handlers[i].disable();
		}
	},

	whenReady: function (callback, context) {
		if (this._loaded) {
			callback.call(context || this, {target: this});
		} else {
			this.on('load', callback, context);
		}
		return this;
	},


	// private methods for getting map state

	_getMapPanePos: function () {
		return L.DomUtil.getPosition(this._mapPane) || new L.Point(0, 0);
	},

	_moved: function () {
		var pos = this._getMapPanePos();
		return pos && !pos.equals([0, 0]);
	},

	_getTopLeftPoint: function (center, zoom) {
		var pixelOrigin = center && zoom !== undefined ?
			this._getNewPixelOrigin(center, zoom) :
			this.getPixelOrigin();
		return pixelOrigin.subtract(this._getMapPanePos());
	},

	_getNewPixelOrigin: function (center, zoom) {
		var viewHalf = this.getSize()._divideBy(2);
		return this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round();
	},

	_latLngToNewLayerPoint: function (latlng, zoom, center) {
		var topLeft = this._getNewPixelOrigin(center, zoom);
		return this.project(latlng, zoom)._subtract(topLeft);
	},

	// layer point of the current center
	_getCenterLayerPoint: function () {
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

	// offset of the specified place to the current center in pixels
	_getCenterOffset: function (latlng) {
		return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
	},

	// adjust center for view to get inside bounds
	_limitCenter: function (center, zoom, bounds) {

		if (!bounds) { return center; }

		var centerPoint = this.project(center, zoom),
		    viewHalf = this.getSize().divideBy(2),
		    viewBounds = new L.Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)),
		    offset = this._getBoundsOffset(viewBounds, bounds, zoom);

		return this.unproject(centerPoint.add(offset), zoom);
	},

	// adjust offset for view to get inside bounds
	_limitOffset: function (offset, bounds) {
		if (!bounds) { return offset; }

		var viewBounds = this.getPixelBounds(),
		    newBounds = new L.Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));

		return offset.add(this._getBoundsOffset(newBounds, bounds));
	},

	// returns offset needed for pxBounds to get inside maxBounds at a specified zoom
	_getBoundsOffset: function (pxBounds, maxBounds, zoom) {
		var nwOffset = this.project(maxBounds.getNorthWest(), zoom).subtract(pxBounds.min),
		    seOffset = this.project(maxBounds.getSouthEast(), zoom).subtract(pxBounds.max),

		    dx = this._rebound(nwOffset.x, -seOffset.x),
		    dy = this._rebound(nwOffset.y, -seOffset.y);

		return new L.Point(dx, dy);
	},

	_rebound: function (left, right) {
		return left + right > 0 ?
			Math.round(left - right) / 2 :
			Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
	},

	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom();
		if (!L.Browser.any3d) { zoom = Math.round(zoom); }

		return Math.max(min, Math.min(max, zoom));
	}
});

L.map = function (id, options) {
	return new L.Map(id, options);
};




L.Layer = L.Evented.extend({

	options: {
		pane: 'overlayPane',
		nonBubblingEvents: []  // Array of events that should not be bubbled to DOM parents (like the map)
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	remove: function () {
		return this.removeFrom(this._map || this._mapToAdd);
	},

	removeFrom: function (obj) {
		if (obj) {
			obj.removeLayer(this);
		}
		return this;
	},

	getPane: function (name) {
		return this._map.getPane(name ? (this.options[name] || name) : this.options.pane);
	},

	addInteractiveTarget: function (targetEl) {
		this._map._targets[L.stamp(targetEl)] = this;
		return this;
	},

	removeInteractiveTarget: function (targetEl) {
		delete this._map._targets[L.stamp(targetEl)];
		return this;
	},

	_layerAdd: function (e) {
		var map = e.target;

		// check in case layer gets added and then removed before the map is ready
		if (!map.hasLayer(this)) { return; }

		this._map = map;
		this._zoomAnimated = map._zoomAnimated;

		if (this.getEvents) {
			map.on(this.getEvents(), this);
		}

		this.onAdd(map);

		if (this.getAttribution && this._map.attributionControl) {
			this._map.attributionControl.addAttribution(this.getAttribution());
		}

		this.fire('add');
		map.fire('layeradd', {layer: this});
	}
});


L.Map.include({
	addLayer: function (layer) {
		var id = L.stamp(layer);
		if (this._layers[id]) { return layer; }
		this._layers[id] = layer;

		layer._mapToAdd = this;

		if (layer.beforeAdd) {
			layer.beforeAdd(this);
		}

		this.whenReady(layer._layerAdd, layer);

		return this;
	},

	removeLayer: function (layer) {
		var id = L.stamp(layer);

		if (!this._layers[id]) { return this; }

		if (this._loaded) {
			layer.onRemove(this);
		}

		if (layer.getAttribution && this.attributionControl) {
			this.attributionControl.removeAttribution(layer.getAttribution());
		}

		if (layer.getEvents) {
			this.off(layer.getEvents(), layer);
		}

		delete this._layers[id];

		if (this._loaded) {
			this.fire('layerremove', {layer: layer});
			layer.fire('remove');
		}

		layer._map = layer._mapToAdd = null;

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (L.stamp(layer) in this._layers);
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	_addLayers: function (layers) {
		layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

		for (var i = 0, len = layers.length; i < len; i++) {
			this.addLayer(layers[i]);
		}
	},

	_addZoomLimit: function (layer) {
		if (isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
			this._zoomBoundLayers[L.stamp(layer)] = layer;
			this._updateZoomLevels();
		}
	},

	_removeZoomLimit: function (layer) {
		var id = L.stamp(layer);

		if (this._zoomBoundLayers[id]) {
			delete this._zoomBoundLayers[id];
			this._updateZoomLevels();
		}
	},

	_updateZoomLevels: function () {
		var minZoom = Infinity,
		    maxZoom = -Infinity,
		    oldZoomSpan = this._getZoomSpan();

		for (var i in this._zoomBoundLayers) {
			var options = this._zoomBoundLayers[i].options;

			minZoom = options.minZoom === undefined ? minZoom : Math.min(minZoom, options.minZoom);
			maxZoom = options.maxZoom === undefined ? maxZoom : Math.max(maxZoom, options.maxZoom);
		}

		this._layersMaxZoom = maxZoom === -Infinity ? undefined : maxZoom;
		this._layersMinZoom = minZoom === Infinity ? undefined : minZoom;

		if (oldZoomSpan !== this._getZoomSpan()) {
			this.fire('zoomlevelschange');
		}
	}
});



/*
 * Mercator projection that takes into account that the Earth is not a perfect sphere.
 * Less popular than spherical mercator; used by projections like EPSG:3395.
 */

L.Projection.Mercator = {
	R: 6378137,
	R_MINOR: 6356752.314245179,

	bounds: L.bounds([-20037508.34279, -15496570.73972], [20037508.34279, 18764656.23138]),

	project: function (latlng) {
		var d = Math.PI / 180,
		    r = this.R,
		    y = latlng.lat * d,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    con = e * Math.sin(y);

		var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
		y = -r * Math.log(Math.max(ts, 1E-10));

		return new L.Point(latlng.lng * d * r, y);
	},

	unproject: function (point) {
		var d = 180 / Math.PI,
		    r = this.R,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    ts = Math.exp(-point.y / r),
		    phi = Math.PI / 2 - 2 * Math.atan(ts);

		for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
			con = e * Math.sin(phi);
			con = Math.pow((1 - con) / (1 + con), e / 2);
			dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
			phi += dphi;
		}

		return new L.LatLng(phi * d, point.x * d / r);
	}
};



/*
 * L.CRS.EPSG3857 (World Mercator) CRS implementation.
 */

L.CRS.EPSG3395 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:3395',
	projection: L.Projection.Mercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * L.Projection.Mercator.R);
		return new L.Transformation(scale, 0.5, -scale, 0.5);
	}())
});



/*
 * L.GridLayer is used as base class for grid-like layers like TileLayer.
 */

L.GridLayer = L.Layer.extend({

	options: {
		pane: 'tilePane',

		tileSize: 256,
		opacity: 1,
		zIndex: 1,

		updateWhenIdle: L.Browser.mobile,
		updateInterval: 200,

		attribution: null,
		bounds: null,

		minZoom: 0
		// maxZoom: <Number>
		// noWrap: false
	},

	initialize: function (options) {
		options = L.setOptions(this, options);
	},

	onAdd: function () {
		this._initContainer();

		this._levels = {};
		this._tiles = {};

		this._resetView();
		this._update();
	},

	beforeAdd: function (map) {
		map._addZoomLimit(this);
	},

	onRemove: function (map) {
		L.DomUtil.remove(this._container);
		map._removeZoomLimit(this);
		this._container = null;
		this._tileZoom = null;
	},

	bringToFront: function () {
		if (this._map) {
			L.DomUtil.toFront(this._container);
			this._setAutoZIndex(Math.max);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			L.DomUtil.toBack(this._container);
			this._setAutoZIndex(Math.min);
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getContainer: function () {
		return this._container;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		this._updateOpacity();
		return this;
	},

	setZIndex: function (zIndex) {
		this.options.zIndex = zIndex;
		this._updateZIndex();

		return this;
	},

	isLoading: function () {
		return this._loading;
	},

	redraw: function () {
		if (this._map) {
			this._removeAllTiles();
			this._update();
		}
		return this;
	},

	getEvents: function () {
		var events = {
			viewreset: this._resetAll,
			zoom: this._resetView,
			moveend: this._onMoveEnd
		};

		if (!this.options.updateWhenIdle) {
			// update tiles on move, but not more often than once per given interval
			if (!this._onMove) {
				this._onMove = L.Util.throttle(this._onMoveEnd, this.options.updateInterval, this);
			}

			events.move = this._onMove;
		}

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	createTile: function () {
		return document.createElement('div');
	},

	getTileSize: function () {
		var s = this.options.tileSize;
		return s instanceof L.Point ? s : new L.Point(s, s);
	},

	_updateZIndex: function () {
		if (this._container && this.options.zIndex !== undefined && this.options.zIndex !== null) {
			this._container.style.zIndex = this.options.zIndex;
		}
	},

	_setAutoZIndex: function (compare) {
		// go through all other layers of the same pane, set zIndex to max + 1 (front) or min - 1 (back)

		var layers = this.getPane().children,
		    edgeZIndex = -compare(-Infinity, Infinity); // -Infinity for max, Infinity for min

		for (var i = 0, len = layers.length, zIndex; i < len; i++) {

			zIndex = layers[i].style.zIndex;

			if (layers[i] !== this._container && zIndex) {
				edgeZIndex = compare(edgeZIndex, +zIndex);
			}
		}

		if (isFinite(edgeZIndex)) {
			this.options.zIndex = edgeZIndex + compare(-1, 1);
			this._updateZIndex();
		}
	},

	_updateOpacity: function () {
		if (!this._map) { return; }

		// IE doesn't inherit filter opacity properly, so we're forced to set it on tiles
		if (L.Browser.ielt9 || !this._map._fadeAnimated) {
			return;
		}

		L.DomUtil.setOpacity(this._container, this.options.opacity);

		var now = +new Date(),
		    nextFrame = false,
		    willPrune = false;

		for (var key in this._tiles) {
			var tile = this._tiles[key];
			if (!tile.current || !tile.loaded) { continue; }

			var fade = Math.min(1, (now - tile.loaded) / 200);

			L.DomUtil.setOpacity(tile.el, fade);
			if (fade < 1) {
				nextFrame = true;
			} else {
				if (tile.active) { willPrune = true; }
				tile.active = true;
			}
		}

		if (willPrune && !this._noPrune) { this._pruneTiles(); }

		if (nextFrame) {
			L.Util.cancelAnimFrame(this._fadeFrame);
			this._fadeFrame = L.Util.requestAnimFrame(this._updateOpacity, this);
		}
	},

	_initContainer: function () {
		if (this._container) { return; }

		this._container = L.DomUtil.create('div', 'leaflet-layer');
		this._updateZIndex();

		if (this.options.opacity < 1) {
			this._updateOpacity();
		}

		this.getPane().appendChild(this._container);
	},

	_updateLevels: function () {

		var zoom = this._tileZoom,
		    maxZoom = this.options.maxZoom;

		for (var z in this._levels) {
			if (this._levels[z].el.children.length || z === zoom) {
				this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
			} else {
				L.DomUtil.remove(this._levels[z].el);
				delete this._levels[z];
			}
		}

		var level = this._levels[zoom],
		    map = this._map;

		if (!level) {
			level = this._levels[zoom] = {};

			level.el = L.DomUtil.create('div', 'leaflet-tile-container leaflet-zoom-animated', this._container);
			level.el.style.zIndex = maxZoom;

			level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
			level.zoom = zoom;

			this._setZoomTransform(level, map.getCenter(), map.getZoom());

			// force the browser to consider the newly added element for transition
			L.Util.falseFn(level.el.offsetWidth);
		}

		this._level = level;

		return level;
	},

	_pruneTiles: function () {
		var key, tile;

		var zoom = this._map.getZoom();
		if (zoom > this.options.maxZoom ||
			zoom < this.options.minZoom) { return this._removeAllTiles(); }

		for (key in this._tiles) {
			tile = this._tiles[key];
			tile.retain = tile.current;
		}

		for (key in this._tiles) {
			tile = this._tiles[key];
			if (tile.current && !tile.active) {
				var coords = tile.coords;
				if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
					this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
				}
			}
		}

		for (key in this._tiles) {
			if (!this._tiles[key].retain) {
				this._removeTile(key);
			}
		}
	},

	_removeAllTiles: function () {
		for (var key in this._tiles) {
			this._removeTile(key);
		}
	},

	_resetAll: function () {
		for (var z in this._levels) {
			L.DomUtil.remove(this._levels[z].el);
			delete this._levels[z];
		}
		this._removeAllTiles();

		this._tileZoom = null;
		this._resetView();
	},

	_retainParent: function (x, y, z, minZoom) {
		var x2 = Math.floor(x / 2),
		    y2 = Math.floor(y / 2),
		    z2 = z - 1;

		var key = x2 + ':' + y2 + ':' + z2,
		    tile = this._tiles[key];

		if (tile && tile.active) {
			tile.retain = true;
			return true;

		} else if (tile && tile.loaded) {
			tile.retain = true;
		}

		if (z2 > minZoom) {
			return this._retainParent(x2, y2, z2, minZoom);
		}

		return false;
	},

	_retainChildren: function (x, y, z, maxZoom) {

		for (var i = 2 * x; i < 2 * x + 2; i++) {
			for (var j = 2 * y; j < 2 * y + 2; j++) {

				var key = i + ':' + j + ':' + (z + 1),
				    tile = this._tiles[key];

				if (tile && tile.active) {
					tile.retain = true;
					continue;

				} else if (tile && tile.loaded) {
					tile.retain = true;
				}

				if (z + 1 < maxZoom) {
					this._retainChildren(i, j, z + 1, maxZoom);
				}
			}
		}
	},

	_resetView: function (e) {
		var animating = e && (e.pinch || e.flyTo);
		this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
	},

	_animateZoom: function (e) {
		this._setView(e.center, e.zoom, true, e.noUpdate);
	},

	_setView: function (center, zoom, noPrune, noUpdate) {
		var tileZoom = Math.round(zoom);
		if ((this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
		    (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)) {
			tileZoom = undefined;
		}

		var tileZoomChanged = (tileZoom !== this._tileZoom);

		if (!noUpdate || tileZoomChanged) {

			this._tileZoom = tileZoom;

			if (this._abortLoading) {
				this._abortLoading();
			}

			this._updateLevels();
			this._resetGrid();

			if (tileZoom !== undefined) {
				this._update(center);
			}

			if (!noPrune) {
				this._pruneTiles();
			}

			// Flag to prevent _updateOpacity from pruning tiles during
			// a zoom anim or a pinch gesture
			this._noPrune = !!noPrune;
		}

		this._setZoomTransforms(center, zoom);
	},

	_setZoomTransforms: function (center, zoom) {
		for (var i in this._levels) {
			this._setZoomTransform(this._levels[i], center, zoom);
		}
	},

	_setZoomTransform: function (level, center, zoom) {
		var scale = this._map.getZoomScale(zoom, level.zoom),
		    translate = level.origin.multiplyBy(scale)
		        .subtract(this._map._getNewPixelOrigin(center, zoom)).round();

		if (L.Browser.any3d) {
			L.DomUtil.setTransform(level.el, translate, scale);
		} else {
			L.DomUtil.setPosition(level.el, translate);
		}
	},

	_resetGrid: function () {
		var map = this._map,
		    crs = map.options.crs,
		    tileSize = this._tileSize = this.getTileSize(),
		    tileZoom = this._tileZoom;

		var bounds = this._map.getPixelWorldBounds(this._tileZoom);
		if (bounds) {
			this._globalTileRange = this._pxBoundsToTileRange(bounds);
		}

		this._wrapX = crs.wrapLng && !this.options.noWrap && [
			Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
			Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
		];
		this._wrapY = crs.wrapLat && !this.options.noWrap && [
			Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
			Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
		];
	},

	_onMoveEnd: function () {
		if (!this._map || this._map._animatingZoom) { return; }

		this._resetView();
	},

	_getTiledPixelBounds: function (center, zoom, tileZoom) {
		var map = this._map,
		    scale = map.getZoomScale(zoom, tileZoom),
		    pixelCenter = map.project(center, tileZoom).floor(),
		    halfSize = map.getSize().divideBy(scale * 2);

		return new L.Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
	},

	// Private method to load tiles in the grid's active zoom level according to map bounds
	_update: function (center) {
		var map = this._map;
		if (!map) { return; }
		var zoom = map.getZoom();

		if (center === undefined) { center = map.getCenter(); }
		if (this._tileZoom === undefined) { return; }	// if out of minzoom/maxzoom

		var pixelBounds = this._getTiledPixelBounds(center, zoom, this._tileZoom),
		    tileRange = this._pxBoundsToTileRange(pixelBounds),
		    tileCenter = tileRange.getCenter(),
		    queue = [];

		for (var key in this._tiles) {
			this._tiles[key].current = false;
		}

		// _update just loads more tiles. If the tile zoom level differs too much
		// from the map's, let _setView reset levels and prune old tiles.
		if (Math.abs(zoom - this._tileZoom) > 1) { this._setView(center, zoom); return; }

		// create a queue of coordinates to load tiles from
		for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
			for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
				var coords = new L.Point(i, j);
				coords.z = this._tileZoom;

				if (!this._isValidTile(coords)) { continue; }

				var tile = this._tiles[this._tileCoordsToKey(coords)];
				if (tile) {
					tile.current = true;
				} else {
					queue.push(coords);
				}
			}
		}

		// sort tile queue to load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
		});

		if (queue.length !== 0) {
			// if its the first batch of tiles to load
			if (!this._loading) {
				this._loading = true;
				this.fire('loading');
			}

			// create DOM fragment to append tiles in one batch
			var fragment = document.createDocumentFragment();

			for (i = 0; i < queue.length; i++) {
				this._addTile(queue[i], fragment);
			}

			this._level.el.appendChild(fragment);
		}
	},

	_isValidTile: function (coords) {
		var crs = this._map.options.crs;

		if (!crs.infinite) {
			// don't load tile if it's out of bounds and not wrapped
			var bounds = this._globalTileRange;
			if ((!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
			    (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))) { return false; }
		}

		if (!this.options.bounds) { return true; }

		// don't load tile if it doesn't intersect the bounds in options
		var tileBounds = this._tileCoordsToBounds(coords);
		return L.latLngBounds(this.options.bounds).overlaps(tileBounds);
	},

	_keyToBounds: function (key) {
		return this._tileCoordsToBounds(this._keyToTileCoords(key));
	},

	// converts tile coordinates to its geographical bounds
	_tileCoordsToBounds: function (coords) {

		var map = this._map,
		    tileSize = this.getTileSize(),

		    nwPoint = coords.scaleBy(tileSize),
		    sePoint = nwPoint.add(tileSize),

		    nw = map.wrapLatLng(map.unproject(nwPoint, coords.z)),
		    se = map.wrapLatLng(map.unproject(sePoint, coords.z));

		return new L.LatLngBounds(nw, se);
	},

	// converts tile coordinates to key for the tile cache
	_tileCoordsToKey: function (coords) {
		return coords.x + ':' + coords.y + ':' + coords.z;
	},

	// converts tile cache key to coordinates
	_keyToTileCoords: function (key) {
		var k = key.split(':'),
		    coords = new L.Point(+k[0], +k[1]);
		coords.z = +k[2];
		return coords;
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];
		if (!tile) { return; }

		L.DomUtil.remove(tile.el);

		delete this._tiles[key];

		this.fire('tileunload', {
			tile: tile.el,
			coords: this._keyToTileCoords(key)
		});
	},

	_initTile: function (tile) {
		L.DomUtil.addClass(tile, 'leaflet-tile');

		var tileSize = this.getTileSize();
		tile.style.width = tileSize.x + 'px';
		tile.style.height = tileSize.y + 'px';

		tile.onselectstart = L.Util.falseFn;
		tile.onmousemove = L.Util.falseFn;

		// update opacity on tiles in IE7-8 because of filter inheritance problems
		if (L.Browser.ielt9 && this.options.opacity < 1) {
			L.DomUtil.setOpacity(tile, this.options.opacity);
		}

		// without this hack, tiles disappear after zoom on Chrome for Android
		// https://github.com/Leaflet/Leaflet/issues/2078
		if (L.Browser.android && !L.Browser.android23) {
			tile.style.WebkitBackfaceVisibility = 'hidden';
		}
	},

	_addTile: function (coords, container) {
		var tilePos = this._getTilePos(coords),
		    key = this._tileCoordsToKey(coords);

		var tile = this.createTile(this._wrapCoords(coords), L.bind(this._tileReady, this, coords));

		this._initTile(tile);

		// if createTile is defined with a second argument ("done" callback),
		// we know that tile is async and will be ready later; otherwise
		if (this.createTile.length < 2) {
			// mark tile as ready, but delay one frame for opacity animation to happen
			L.Util.requestAnimFrame(L.bind(this._tileReady, this, coords, null, tile));
		}

		L.DomUtil.setPosition(tile, tilePos);

		// save tile in cache
		this._tiles[key] = {
			el: tile,
			coords: coords,
			current: true
		};

		container.appendChild(tile);
		this.fire('tileloadstart', {
			tile: tile,
			coords: coords
		});
	},

	_tileReady: function (coords, err, tile) {
		if (!this._map) { return; }

		if (err) {
			this.fire('tileerror', {
				error: err,
				tile: tile,
				coords: coords
			});
		}

		var key = this._tileCoordsToKey(coords);

		tile = this._tiles[key];
		if (!tile) { return; }

		tile.loaded = +new Date();
		if (this._map._fadeAnimated) {
			L.DomUtil.setOpacity(tile.el, 0);
			L.Util.cancelAnimFrame(this._fadeFrame);
			this._fadeFrame = L.Util.requestAnimFrame(this._updateOpacity, this);
		} else {
			tile.active = true;
			this._pruneTiles();
		}

		L.DomUtil.addClass(tile.el, 'leaflet-tile-loaded');

		this.fire('tileload', {
			tile: tile.el,
			coords: coords
		});

		if (this._noTilesToLoad()) {
			this._loading = false;
			this.fire('load');
		}
	},

	_getTilePos: function (coords) {
		return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
	},

	_wrapCoords: function (coords) {
		var newCoords = new L.Point(
			this._wrapX ? L.Util.wrapNum(coords.x, this._wrapX) : coords.x,
			this._wrapY ? L.Util.wrapNum(coords.y, this._wrapY) : coords.y);
		newCoords.z = coords.z;
		return newCoords;
	},

	_pxBoundsToTileRange: function (bounds) {
		var tileSize = this.getTileSize();
		return new L.Bounds(
			bounds.min.unscaleBy(tileSize).floor(),
			bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]));
	},

	_noTilesToLoad: function () {
		for (var key in this._tiles) {
			if (!this._tiles[key].loaded) { return false; }
		}
		return true;
	}
});

L.gridLayer = function (options) {
	return new L.GridLayer(options);
};



/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

L.TileLayer = L.GridLayer.extend({

	options: {
		maxZoom: 18,

		subdomains: 'abc',
		errorTileUrl: '',
		zoomOffset: 0,

		maxNativeZoom: null, // Number
		tms: false,
		zoomReverse: false,
		detectRetina: false,
		crossOrigin: false
	},

	initialize: function (url, options) {

		this._url = url;

		options = L.setOptions(this, options);

		// detecting retina displays, adjusting tileSize and zoom levels
		if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;

			options.minZoom = Math.max(0, options.minZoom);
			options.maxZoom--;
		}

		if (typeof options.subdomains === 'string') {
			options.subdomains = options.subdomains.split('');
		}

		// for https://github.com/Leaflet/Leaflet/issues/137
		if (!L.Browser.android) {
			this.on('tileunload', this._onTileRemove);
		}
	},

	setUrl: function (url, noRedraw) {
		this._url = url;

		if (!noRedraw) {
			this.redraw();
		}
		return this;
	},

	createTile: function (coords, done) {
		var tile = document.createElement('img');

		L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
		L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

		if (this.options.crossOrigin) {
			tile.crossOrigin = '';
		}

		/*
		 Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		*/
		tile.alt = '';

		tile.src = this.getTileUrl(coords);

		return tile;
	},

	getTileUrl: function (coords) {
		return L.Util.template(this._url, L.extend({
			r: this.options.detectRetina && L.Browser.retina && this.options.maxZoom > 0 ? '@2x' : '',
			s: this._getSubdomain(coords),
			x: coords.x,
			y: this.options.tms ? this._globalTileRange.max.y - coords.y : coords.y,
			z: this._getZoomForUrl()
		}, this.options));
	},

	_tileOnLoad: function (done, tile) {
		// For https://github.com/Leaflet/Leaflet/issues/3332
		if (L.Browser.ielt9) {
			setTimeout(L.bind(done, this, null, tile), 0);
		} else {
			done(null, tile);
		}
	},

	_tileOnError: function (done, tile, e) {
		var errorUrl = this.options.errorTileUrl;
		if (errorUrl) {
			tile.src = errorUrl;
		}
		done(e, tile);
	},

	getTileSize: function () {
		var map = this._map,
		    tileSize = L.GridLayer.prototype.getTileSize.call(this),
		    zoom = this._tileZoom + this.options.zoomOffset,
		    zoomN = this.options.maxNativeZoom;

		// increase tile size when overscaling
		return zoomN !== null && zoom > zoomN ?
				tileSize.divideBy(map.getZoomScale(zoomN, zoom)).round() :
				tileSize;
	},

	_onTileRemove: function (e) {
		e.tile.onload = null;
	},

	_getZoomForUrl: function () {

		var options = this.options,
		    zoom = this._tileZoom;

		if (options.zoomReverse) {
			zoom = options.maxZoom - zoom;
		}

		zoom += options.zoomOffset;

		return options.maxNativeZoom !== null ? Math.min(zoom, options.maxNativeZoom) : zoom;
	},

	_getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
		return this.options.subdomains[index];
	},

	// stops loading all tiles in the background layer
	_abortLoading: function () {
		var i, tile;
		for (i in this._tiles) {
			if (this._tiles[i].coords.z !== this._tileZoom) {
				tile = this._tiles[i].el;

				tile.onload = L.Util.falseFn;
				tile.onerror = L.Util.falseFn;

				if (!tile.complete) {
					tile.src = L.Util.emptyImageUrl;
					L.DomUtil.remove(tile);
				}
			}
		}
	}
});

L.tileLayer = function (url, options) {
	return new L.TileLayer(url, options);
};



/*
 * L.TileLayer.WMS is used for WMS tile layers.
 */

L.TileLayer.WMS = L.TileLayer.extend({

	defaultWmsParams: {
		service: 'WMS',
		request: 'GetMap',
		version: '1.1.1',
		layers: '',
		styles: '',
		format: 'image/jpeg',
		transparent: false
	},

	options: {
		crs: null,
		uppercase: false
	},

	initialize: function (url, options) {

		this._url = url;

		var wmsParams = L.extend({}, this.defaultWmsParams);

		// all keys that are not TileLayer options go to WMS params
		for (var i in options) {
			if (!(i in this.options)) {
				wmsParams[i] = options[i];
			}
		}

		options = L.setOptions(this, options);

		wmsParams.width = wmsParams.height = options.tileSize * (options.detectRetina && L.Browser.retina ? 2 : 1);

		this.wmsParams = wmsParams;
	},

	onAdd: function (map) {

		this._crs = this.options.crs || map.options.crs;
		this._wmsVersion = parseFloat(this.wmsParams.version);

		var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
		this.wmsParams[projectionKey] = this._crs.code;

		L.TileLayer.prototype.onAdd.call(this, map);
	},

	getTileUrl: function (coords) {

		var tileBounds = this._tileCoordsToBounds(coords),
		    nw = this._crs.project(tileBounds.getNorthWest()),
		    se = this._crs.project(tileBounds.getSouthEast()),

		    bbox = (this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326 ?
			    [se.y, nw.x, nw.y, se.x] :
			    [nw.x, se.y, se.x, nw.y]).join(','),

		    url = L.TileLayer.prototype.getTileUrl.call(this, coords);

		return url +
			L.Util.getParamString(this.wmsParams, url, this.options.uppercase) +
			(this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
	},

	setParams: function (params, noRedraw) {

		L.extend(this.wmsParams, params);

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	}
});

L.tileLayer.wms = function (url, options) {
	return new L.TileLayer.WMS(url, options);
};



/*
 * L.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */

L.ImageOverlay = L.Layer.extend({

	options: {
		opacity: 1,
		alt: '',
		interactive: false

		/*
		crossOrigin: <Boolean>,
		*/
	},

	initialize: function (url, bounds, options) { // (String, LatLngBounds, Object)
		this._url = url;
		this._bounds = L.latLngBounds(bounds);

		L.setOptions(this, options);
	},

	onAdd: function () {
		if (!this._image) {
			this._initImage();

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}

		if (this.options.interactive) {
			L.DomUtil.addClass(this._image, 'leaflet-interactive');
			this.addInteractiveTarget(this._image);
		}

		this.getPane().appendChild(this._image);
		this._reset();
	},

	onRemove: function () {
		L.DomUtil.remove(this._image);
		if (this.options.interactive) {
			this.removeInteractiveTarget(this._image);
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._image) {
			this._updateOpacity();
		}
		return this;
	},

	setStyle: function (styleOpts) {
		if (styleOpts.opacity) {
			this.setOpacity(styleOpts.opacity);
		}
		return this;
	},

	bringToFront: function () {
		if (this._map) {
			L.DomUtil.toFront(this._image);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			L.DomUtil.toBack(this._image);
		}
		return this;
	},

	setUrl: function (url) {
		this._url = url;

		if (this._image) {
			this._image.src = url;
		}
		return this;
	},

	setBounds: function (bounds) {
		this._bounds = bounds;

		if (this._map) {
			this._reset();
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getEvents: function () {
		var events = {
			zoom: this._reset,
			viewreset: this._reset
		};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	getBounds: function () {
		return this._bounds;
	},

	getElement: function () {
		return this._image;
	},

	_initImage: function () {
		var img = this._image = L.DomUtil.create('img',
				'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));

		img.onselectstart = L.Util.falseFn;
		img.onmousemove = L.Util.falseFn;

		img.onload = L.bind(this.fire, this, 'load');

		if (this.options.crossOrigin) {
			img.crossOrigin = '';
		}

		img.src = this._url;
		img.alt = this.options.alt;
	},

	_animateZoom: function (e) {
		var scale = this._map.getZoomScale(e.zoom),
		    offset = this._map._latLngToNewLayerPoint(this._bounds.getNorthWest(), e.zoom, e.center);

		L.DomUtil.setTransform(this._image, offset, scale);
	},

	_reset: function () {
		var image = this._image,
		    bounds = new L.Bounds(
		        this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
		        this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
		    size = bounds.getSize();

		L.DomUtil.setPosition(image, bounds.min);

		image.style.width  = size.x + 'px';
		image.style.height = size.y + 'px';
	},

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._image, this.options.opacity);
	}
});

L.imageOverlay = function (url, bounds, options) {
	return new L.ImageOverlay(url, bounds, options);
};



/*
 * L.Icon is an image-based icon class that you can use with L.Marker for custom markers.
 */

L.Icon = L.Class.extend({
	/*
	options: {
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		className: (String)
	},
	*/

	initialize: function (options) {
		L.setOptions(this, options);
	},

	createIcon: function (oldIcon) {
		return this._createIcon('icon', oldIcon);
	},

	createShadow: function (oldIcon) {
		return this._createIcon('shadow', oldIcon);
	},

	_createIcon: function (name, oldIcon) {
		var src = this._getIconUrl(name);

		if (!src) {
			if (name === 'icon') {
				throw new Error('iconUrl not set in Icon options (see the docs).');
			}
			return null;
		}

		var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
		this._setIconStyles(img, name);

		return img;
	},

	_setIconStyles: function (img, name) {
		var options = this.options,
		    size = L.point(options[name + 'Size']),
		    anchor = L.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
		            size && size.divideBy(2, true));

		img.className = 'leaflet-marker-' + name + ' ' + (options.className || '');

		if (anchor) {
			img.style.marginLeft = (-anchor.x) + 'px';
			img.style.marginTop  = (-anchor.y) + 'px';
		}

		if (size) {
			img.style.width  = size.x + 'px';
			img.style.height = size.y + 'px';
		}
	},

	_createImg: function (src, el) {
		el = el || document.createElement('img');
		el.src = src;
		return el;
	},

	_getIconUrl: function (name) {
		return L.Browser.retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
	}
});

L.icon = function (options) {
	return new L.Icon(options);
};



/*
 * L.Icon.Default is the blue marker icon used by default in Leaflet.
 */

L.Icon.Default = L.Icon.extend({

	options: {
		iconSize:    [25, 41],
		iconAnchor:  [12, 41],
		popupAnchor: [1, -34],
		shadowSize:  [41, 41]
	},

	_getIconUrl: function (name) {
		var key = name + 'Url';

		if (this.options[key]) {
			return this.options[key];
		}

		var path = L.Icon.Default.imagePath;

		if (!path) {
			throw new Error('Couldn\'t autodetect L.Icon.Default.imagePath, set it manually.');
		}

		return path + '/marker-' + name + (L.Browser.retina && name === 'icon' ? '-2x' : '') + '.png';
	}
});

L.Icon.Default.imagePath = (function () {
	var scripts = document.getElementsByTagName('script'),
	    leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

	var i, len, src, path;

	for (i = 0, len = scripts.length; i < len; i++) {
		src = scripts[i].src || '';

		if (src.match(leafletRe)) {
			path = src.split(leafletRe)[0];
			return (path ? path + '/' : '') + 'images';
		}
	}
}());



/*
 * L.Marker is used to display clickable/draggable icons on the map.
 */

L.Marker = L.Layer.extend({

	options: {
		pane: 'markerPane',
		nonBubblingEvents: ['click', 'dblclick', 'mouseover', 'mouseout', 'contextmenu'],

		icon: new L.Icon.Default(),
		// title: '',
		// alt: '',
		interactive: true,
		// draggable: false,
		keyboard: true,
		zIndexOffset: 0,
		opacity: 1,
		// riseOnHover: false,
		riseOffset: 250
	},

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;

		this._initIcon();
		this.update();
	},

	onRemove: function () {
		if (this.dragging && this.dragging.enabled()) {
			this.options.draggable = true;
			this.dragging.removeHooks();
		}

		this._removeIcon();
		this._removeShadow();
	},

	getEvents: function () {
		var events = {
			zoom: this.update,
			viewreset: this.update
		};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		var oldLatLng = this._latlng;
		this._latlng = L.latLng(latlng);
		this.update();
		return this.fire('move', {oldLatLng: oldLatLng, latlng: this._latlng});
	},

	setZIndexOffset: function (offset) {
		this.options.zIndexOffset = offset;
		return this.update();
	},

	setIcon: function (icon) {

		this.options.icon = icon;

		if (this._map) {
			this._initIcon();
			this.update();
		}

		if (this._popup) {
			this.bindPopup(this._popup, this._popup.options);
		}

		return this;
	},

	getElement: function () {
		return this._icon;
	},

	update: function () {

		if (this._icon) {
			var pos = this._map.latLngToLayerPoint(this._latlng).round();
			this._setPos(pos);
		}

		return this;
	},

	_initIcon: function () {
		var options = this.options,
		    classToAdd = 'leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

		var icon = options.icon.createIcon(this._icon),
		    addIcon = false;

		// if we're not reusing the icon, remove the old one and init new one
		if (icon !== this._icon) {
			if (this._icon) {
				this._removeIcon();
			}
			addIcon = true;

			if (options.title) {
				icon.title = options.title;
			}
			if (options.alt) {
				icon.alt = options.alt;
			}
		}

		L.DomUtil.addClass(icon, classToAdd);

		if (options.keyboard) {
			icon.tabIndex = '0';
		}

		this._icon = icon;

		if (options.riseOnHover) {
			this.on({
				mouseover: this._bringToFront,
				mouseout: this._resetZIndex
			});
		}

		var newShadow = options.icon.createShadow(this._shadow),
		    addShadow = false;

		if (newShadow !== this._shadow) {
			this._removeShadow();
			addShadow = true;
		}

		if (newShadow) {
			L.DomUtil.addClass(newShadow, classToAdd);
		}
		this._shadow = newShadow;


		if (options.opacity < 1) {
			this._updateOpacity();
		}


		if (addIcon) {
			this.getPane().appendChild(this._icon);
			this._initInteraction();
		}
		if (newShadow && addShadow) {
			this.getPane('shadowPane').appendChild(this._shadow);
		}
	},

	_removeIcon: function () {
		if (this.options.riseOnHover) {
			this.off({
				mouseover: this._bringToFront,
				mouseout: this._resetZIndex
			});
		}

		L.DomUtil.remove(this._icon);
		this.removeInteractiveTarget(this._icon);

		this._icon = null;
	},

	_removeShadow: function () {
		if (this._shadow) {
			L.DomUtil.remove(this._shadow);
		}
		this._shadow = null;
	},

	_setPos: function (pos) {
		L.DomUtil.setPosition(this._icon, pos);

		if (this._shadow) {
			L.DomUtil.setPosition(this._shadow, pos);
		}

		this._zIndex = pos.y + this.options.zIndexOffset;

		this._resetZIndex();
	},

	_updateZIndex: function (offset) {
		this._icon.style.zIndex = this._zIndex + offset;
	},

	_animateZoom: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();

		this._setPos(pos);
	},

	_initInteraction: function () {

		if (!this.options.interactive) { return; }

		L.DomUtil.addClass(this._icon, 'leaflet-interactive');

		this.addInteractiveTarget(this._icon);

		if (L.Handler.MarkerDrag) {
			var draggable = this.options.draggable;
			if (this.dragging) {
				draggable = this.dragging.enabled();
				this.dragging.disable();
			}

			this.dragging = new L.Handler.MarkerDrag(this);

			if (draggable) {
				this.dragging.enable();
			}
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	_updateOpacity: function () {
		var opacity = this.options.opacity;

		L.DomUtil.setOpacity(this._icon, opacity);

		if (this._shadow) {
			L.DomUtil.setOpacity(this._shadow, opacity);
		}
	},

	_bringToFront: function () {
		this._updateZIndex(this.options.riseOffset);
	},

	_resetZIndex: function () {
		this._updateZIndex(0);
	}
});

L.marker = function (latlng, options) {
	return new L.Marker(latlng, options);
};



/*
 * L.DivIcon is a lightweight HTML-based icon class (as opposed to the image-based L.Icon)
 * to use with L.Marker.
 */

L.DivIcon = L.Icon.extend({
	options: {
		iconSize: [12, 12], // also can be set through CSS
		/*
		iconAnchor: (Point)
		popupAnchor: (Point)
		html: (String)
		bgPos: (Point)
		*/
		className: 'leaflet-div-icon',
		html: false
	},

	createIcon: function (oldIcon) {
		var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
		    options = this.options;

		div.innerHTML = options.html !== false ? options.html : '';

		if (options.bgPos) {
			div.style.backgroundPosition = (-options.bgPos.x) + 'px ' + (-options.bgPos.y) + 'px';
		}
		this._setIconStyles(div, 'icon');

		return div;
	},

	createShadow: function () {
		return null;
	}
});

L.divIcon = function (options) {
	return new L.DivIcon(options);
};



/*
 * L.Popup is used for displaying popups on the map.
 */

L.Map.mergeOptions({
	closePopupOnClick: true
});

L.Popup = L.Layer.extend({

	options: {
		pane: 'popupPane',

		minWidth: 50,
		maxWidth: 300,
		// maxHeight: <Number>,
		offset: [0, 7],

		autoPan: true,
		autoPanPadding: [5, 5],
		// autoPanPaddingTopLeft: <Point>,
		// autoPanPaddingBottomRight: <Point>,

		closeButton: true,
		autoClose: true,
		// keepInView: false,
		// className: '',
		zoomAnimation: true
	},

	initialize: function (options, source) {
		L.setOptions(this, options);

		this._source = source;
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && this.options.zoomAnimation;

		if (!this._container) {
			this._initLayout();
		}

		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 0);
		}

		clearTimeout(this._removeTimeout);
		this.getPane().appendChild(this._container);
		this.update();

		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 1);
		}

		map.fire('popupopen', {popup: this});

		if (this._source) {
			this._source.fire('popupopen', {popup: this}, true);
		}
	},

	openOn: function (map) {
		map.openPopup(this);
		return this;
	},

	onRemove: function (map) {
		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 0);
			this._removeTimeout = setTimeout(L.bind(L.DomUtil.remove, L.DomUtil, this._container), 200);
		} else {
			L.DomUtil.remove(this._container);
		}

		map.fire('popupclose', {popup: this});

		if (this._source) {
			this._source.fire('popupclose', {popup: this}, true);
		}
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		if (this._map) {
			this._updatePosition();
			this._adjustPan();
		}
		return this;
	},

	getContent: function () {
		return this._content;
	},

	setContent: function (content) {
		this._content = content;
		this.update();
		return this;
	},

	getElement: function () {
		return this._container;
	},

	update: function () {
		if (!this._map) { return; }

		this._container.style.visibility = 'hidden';

		this._updateContent();
		this._updateLayout();
		this._updatePosition();

		this._container.style.visibility = '';

		this._adjustPan();
	},

	getEvents: function () {
		var events = {
			zoom: this._updatePosition,
			viewreset: this._updatePosition
		};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		if ('closeOnClick' in this.options ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
			events.preclick = this._close;
		}
		if (this.options.keepInView) {
			events.moveend = this._adjustPan;
		}
		return events;
	},

	isOpen: function () {
		return !!this._map && this._map.hasLayer(this);
	},

	bringToFront: function () {
		if (this._map) {
			L.DomUtil.toFront(this._container);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			L.DomUtil.toBack(this._container);
		}
		return this;
	},

	_close: function () {
		if (this._map) {
			this._map.closePopup(this);
		}
	},

	_initLayout: function () {
		var prefix = 'leaflet-popup',
		    container = this._container = L.DomUtil.create('div',
			prefix + ' ' + (this.options.className || '') +
			' leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide'));

		if (this.options.closeButton) {
			var closeButton = this._closeButton = L.DomUtil.create('a', prefix + '-close-button', container);
			closeButton.href = '#close';
			closeButton.innerHTML = '&#215;';

			L.DomEvent.on(closeButton, 'click', this._onCloseButtonClick, this);
		}

		var wrapper = this._wrapper = L.DomUtil.create('div', prefix + '-content-wrapper', container);
		this._contentNode = L.DomUtil.create('div', prefix + '-content', wrapper);

		L.DomEvent
			.disableClickPropagation(wrapper)
			.disableScrollPropagation(this._contentNode)
			.on(wrapper, 'contextmenu', L.DomEvent.stopPropagation);

		this._tipContainer = L.DomUtil.create('div', prefix + '-tip-container', container);
		this._tip = L.DomUtil.create('div', prefix + '-tip', this._tipContainer);
	},

	_updateContent: function () {
		if (!this._content) { return; }

		var node = this._contentNode;
		var content = (typeof this._content === 'function') ? this._content(this._source || this) : this._content;

		if (typeof content === 'string') {
			node.innerHTML = content;
		} else {
			while (node.hasChildNodes()) {
				node.removeChild(node.firstChild);
			}
			node.appendChild(content);
		}
		this.fire('contentupdate');
	},

	_updateLayout: function () {
		var container = this._contentNode,
		    style = container.style;

		style.width = '';
		style.whiteSpace = 'nowrap';

		var width = container.offsetWidth;
		width = Math.min(width, this.options.maxWidth);
		width = Math.max(width, this.options.minWidth);

		style.width = (width + 1) + 'px';
		style.whiteSpace = '';

		style.height = '';

		var height = container.offsetHeight,
		    maxHeight = this.options.maxHeight,
		    scrolledClass = 'leaflet-popup-scrolled';

		if (maxHeight && height > maxHeight) {
			style.height = maxHeight + 'px';
			L.DomUtil.addClass(container, scrolledClass);
		} else {
			L.DomUtil.removeClass(container, scrolledClass);
		}

		this._containerWidth = this._container.offsetWidth;
	},

	_updatePosition: function () {
		if (!this._map) { return; }

		var pos = this._map.latLngToLayerPoint(this._latlng),
		    offset = L.point(this.options.offset);

		if (this._zoomAnimated) {
			L.DomUtil.setPosition(this._container, pos);
		} else {
			offset = offset.add(pos);
		}

		var bottom = this._containerBottom = -offset.y,
		    left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

		// bottom position the popup in case the height of the popup changes (images loading etc)
		this._container.style.bottom = bottom + 'px';
		this._container.style.left = left + 'px';
	},

	_animateZoom: function (e) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
		L.DomUtil.setPosition(this._container, pos);
	},

	_adjustPan: function () {
		if (!this.options.autoPan || (this._map._panAnim && this._map._panAnim._inProgress)) { return; }

		var map = this._map,
		    containerHeight = this._container.offsetHeight,
		    containerWidth = this._containerWidth,
		    layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);

		if (this._zoomAnimated) {
			layerPos._add(L.DomUtil.getPosition(this._container));
		}

		var containerPos = map.layerPointToContainerPoint(layerPos),
		    padding = L.point(this.options.autoPanPadding),
		    paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
		    paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
		    size = map.getSize(),
		    dx = 0,
		    dy = 0;

		if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
			dx = containerPos.x + containerWidth - size.x + paddingBR.x;
		}
		if (containerPos.x - dx - paddingTL.x < 0) { // left
			dx = containerPos.x - paddingTL.x;
		}
		if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
			dy = containerPos.y + containerHeight - size.y + paddingBR.y;
		}
		if (containerPos.y - dy - paddingTL.y < 0) { // top
			dy = containerPos.y - paddingTL.y;
		}

		if (dx || dy) {
			map
			    .fire('autopanstart')
			    .panBy([dx, dy]);
		}
	},

	_onCloseButtonClick: function (e) {
		this._close();
		L.DomEvent.stop(e);
	}
});

L.popup = function (options, source) {
	return new L.Popup(options, source);
};


L.Map.include({
	openPopup: function (popup, latlng, options) { // (Popup) or (String || HTMLElement, LatLng[, Object])
		if (!(popup instanceof L.Popup)) {
			popup = new L.Popup(options).setContent(popup);
		}

		if (latlng) {
			popup.setLatLng(latlng);
		}

		if (this.hasLayer(popup)) {
			return this;
		}

		if (this._popup && this._popup.options.autoClose) {
			this.closePopup();
		}

		this._popup = popup;
		return this.addLayer(popup);
	},

	closePopup: function (popup) {
		if (!popup || popup === this._popup) {
			popup = this._popup;
			this._popup = null;
		}
		if (popup) {
			this.removeLayer(popup);
		}
		return this;
	}
});



/*
 * Adds popup-related methods to all layers.
 */

L.Layer.include({

	bindPopup: function (content, options) {

		if (content instanceof L.Popup) {
			L.setOptions(content, options);
			this._popup = content;
			content._source = this;
		} else {
			if (!this._popup || options) {
				this._popup = new L.Popup(options, this);
			}
			this._popup.setContent(content);
		}

		if (!this._popupHandlersAdded) {
			this.on({
				click: this._openPopup,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = true;
		}

		// save the originally passed offset
		this._originalPopupOffset = this._popup.options.offset;

		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this.off({
				click: this._openPopup,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = false;
			this._popup = null;
		}
		return this;
	},

	openPopup: function (layer, latlng) {
		if (!(layer instanceof L.Layer)) {
			latlng = layer;
			layer = this;
		}

		if (layer instanceof L.FeatureGroup) {
			for (var id in this._layers) {
				layer = this._layers[id];
				break;
			}
		}

		if (!latlng) {
			latlng = layer.getCenter ? layer.getCenter() : layer.getLatLng();
		}

		if (this._popup && this._map) {
			// set the popup offset for this layer
			this._popup.options.offset = this._popupAnchor(layer);

			// set popup source to this layer
			this._popup._source = layer;

			// update the popup (content, layout, ect...)
			this._popup.update();

			// open the popup on the map
			this._map.openPopup(this._popup, latlng);
		}

		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	togglePopup: function (target) {
		if (this._popup) {
			if (this._popup._map) {
				this.closePopup();
			} else {
				this.openPopup(target);
			}
		}
		return this;
	},

	isPopupOpen: function () {
		return this._popup.isOpen();
	},

	setPopupContent: function (content) {
		if (this._popup) {
			this._popup.setContent(content);
		}
		return this;
	},

	getPopup: function () {
		return this._popup;
	},

	_openPopup: function (e) {
		var layer = e.layer || e.target;

		if (!this._popup) {
			return;
		}

		if (!this._map) {
			return;
		}

		// if this inherits from Path its a vector and we can just
		// open the popup at the new location
		if (layer instanceof L.Path) {
			this.openPopup(e.layer || e.target, e.latlng);
			return;
		}

		// otherwise treat it like a marker and figure out
		// if we should toggle it open/closed
		if (this._map.hasLayer(this._popup) && this._popup._source === layer) {
			this.closePopup();
		} else {
			this.openPopup(layer, e.latlng);
		}
	},

	_popupAnchor: function (layer) {
		// where shold we anchor the popup on this layer?
		var anchor = layer._getPopupAnchor ? layer._getPopupAnchor() : [0, 0];

		// add the users passed offset to that
		var offsetToAdd = this._originalPopupOffset || L.Popup.prototype.options.offset;

		// return the final point to anchor the popup
		return L.point(anchor).add(offsetToAdd);
	},

	_movePopup: function (e) {
		this._popup.setLatLng(e.latlng);
	}
});



/*
 * Popup extension to L.Marker, adding popup-related methods.
 */

L.Marker.include({
	_getPopupAnchor: function () {
		return this.options.icon.options.popupAnchor || [0, 0];
	}
});



/*
 * L.LayerGroup is a class to combine several layers into one so that
 * you can manipulate the group (e.g. add/remove it) as one layer.
 */

L.LayerGroup = L.Layer.extend({

	initialize: function (layers) {
		this._layers = {};

		var i, len;

		if (layers) {
			for (i = 0, len = layers.length; i < len; i++) {
				this.addLayer(layers[i]);
			}
		}
	},

	addLayer: function (layer) {
		var id = this.getLayerId(layer);

		this._layers[id] = layer;

		if (this._map) {
			this._map.addLayer(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = layer in this._layers ? layer : this.getLayerId(layer);

		if (this._map && this._layers[id]) {
			this._map.removeLayer(this._layers[id]);
		}

		delete this._layers[id];

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (layer in this._layers || this.getLayerId(layer) in this._layers);
	},

	clearLayers: function () {
		for (var i in this._layers) {
			this.removeLayer(this._layers[i]);
		}
		return this;
	},

	invoke: function (methodName) {
		var args = Array.prototype.slice.call(arguments, 1),
		    i, layer;

		for (i in this._layers) {
			layer = this._layers[i];

			if (layer[methodName]) {
				layer[methodName].apply(layer, args);
			}
		}

		return this;
	},

	onAdd: function (map) {
		for (var i in this._layers) {
			map.addLayer(this._layers[i]);
		}
	},

	onRemove: function (map) {
		for (var i in this._layers) {
			map.removeLayer(this._layers[i]);
		}
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	getLayer: function (id) {
		return this._layers[id];
	},

	getLayers: function () {
		var layers = [];

		for (var i in this._layers) {
			layers.push(this._layers[i]);
		}
		return layers;
	},

	setZIndex: function (zIndex) {
		return this.invoke('setZIndex', zIndex);
	},

	getLayerId: function (layer) {
		return L.stamp(layer);
	}
});

L.layerGroup = function (layers) {
	return new L.LayerGroup(layers);
};



/*
 * L.FeatureGroup extends L.LayerGroup by introducing mouse events and additional methods
 * shared between a group of interactive layers (like vectors or markers).
 */

L.FeatureGroup = L.LayerGroup.extend({

	addLayer: function (layer) {
		if (this.hasLayer(layer)) {
			return this;
		}

		layer.addEventParent(this);

		L.LayerGroup.prototype.addLayer.call(this, layer);

		return this.fire('layeradd', {layer: layer});
	},

	removeLayer: function (layer) {
		if (!this.hasLayer(layer)) {
			return this;
		}
		if (layer in this._layers) {
			layer = this._layers[layer];
		}

		layer.removeEventParent(this);

		L.LayerGroup.prototype.removeLayer.call(this, layer);

		return this.fire('layerremove', {layer: layer});
	},

	setStyle: function (style) {
		return this.invoke('setStyle', style);
	},

	bringToFront: function () {
		return this.invoke('bringToFront');
	},

	bringToBack: function () {
		return this.invoke('bringToBack');
	},

	getBounds: function () {
		var bounds = new L.LatLngBounds();

		for (var id in this._layers) {
			var layer = this._layers[id];
			bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
		}
		return bounds;
	}
});

L.featureGroup = function (layers) {
	return new L.FeatureGroup(layers);
};



/*
 * L.Renderer is a base class for renderer implementations (SVG, Canvas);
 * handles renderer container, bounds and zoom animation.
 */

L.Renderer = L.Layer.extend({

	options: {
		// how much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction; defaults to clip with the map view
		padding: 0.1
	},

	initialize: function (options) {
		L.setOptions(this, options);
		L.stamp(this);
	},

	onAdd: function () {
		if (!this._container) {
			this._initContainer(); // defined by renderer implementations

			if (this._zoomAnimated) {
				L.DomUtil.addClass(this._container, 'leaflet-zoom-animated');
			}
		}

		this.getPane().appendChild(this._container);
		this._update();
	},

	onRemove: function () {
		L.DomUtil.remove(this._container);
	},

	getEvents: function () {
		var events = {
			viewreset: this._reset,
			zoomstart: this._onZoomStart,
			zoom: this._onZoom,
			moveend: this._update
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._onAnimZoom;
		}
		return events;
	},

	_onAnimZoom: function (ev) {
		this._updateTransform(ev.center, ev.zoom);
	},

	_onZoom: function () {
		this._updateTransform(this._map.getCenter(), this._map.getZoom());
	},

	_onZoomStart: function () {
		// Drag-then-pinch interactions might mess up the center and zoom.
		// In this case, the easiest way to prevent this is re-do the renderer
		//   bounds and padding when the zooming starts.
		this._update();
	},

	_updateTransform: function (center, zoom) {
		var scale = this._map.getZoomScale(zoom, this._zoom),
		    position = L.DomUtil.getPosition(this._container),
		    viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
		    currentCenterPoint = this._map.project(this._center, zoom),
		    destCenterPoint = this._map.project(center, zoom),
		    centerOffset = destCenterPoint.subtract(currentCenterPoint),

		    topLeftOffset = viewHalf.multiplyBy(-scale).add(position).add(viewHalf).subtract(centerOffset);

		L.DomUtil.setTransform(this._container, topLeftOffset, scale);
	},

	_reset: function () {
		this._update();
		this._updateTransform(this._center, this._zoom);
	},

	_update: function () {
		// update pixel bounds of renderer container (for positioning/sizing/clipping later)
		var p = this.options.padding,
		    size = this._map.getSize(),
		    min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

		this._bounds = new L.Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());

		this._center = this._map.getCenter();
		this._zoom = this._map.getZoom();
	}
});


L.Map.include({
	// used by each vector layer to decide which renderer to use
	getRenderer: function (layer) {
		var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;

		if (!renderer) {
			renderer = this._renderer = (this.options.preferCanvas && L.canvas()) || L.svg();
		}

		if (!this.hasLayer(renderer)) {
			this.addLayer(renderer);
		}
		return renderer;
	},

	_getPaneRenderer: function (name) {
		if (name === 'overlayPane' || name === undefined) {
			return false;
		}

		var renderer = this._paneRenderers[name];
		if (renderer === undefined) {
			renderer = (L.SVG && L.svg({pane: name})) || (L.Canvas && L.canvas({pane: name}));
			this._paneRenderers[name] = renderer;
		}
		return renderer;
	}
});



/*
 * L.Path is the base class for all Leaflet vector layers like polygons and circles.
 */

L.Path = L.Layer.extend({

	options: {
		stroke: true,
		color: '#3388ff',
		weight: 3,
		opacity: 1,
		lineCap: 'round',
		lineJoin: 'round',
		// dashArray: null
		// dashOffset: null

		// fill: false
		// fillColor: same as color by default
		fillOpacity: 0.2,
		fillRule: 'evenodd',

		// className: ''
		interactive: true
	},

	beforeAdd: function (map) {
		// Renderer is set here because we need to call renderer.getEvents
		// before this.getEvents.
		this._renderer = map.getRenderer(this);
	},

	onAdd: function () {
		this._renderer._initPath(this);
		this._reset();
		this._renderer._addPath(this);
	},

	onRemove: function () {
		this._renderer._removePath(this);
	},

	getEvents: function () {
		return {
			zoomend: this._project,
			moveend: this._update,
			viewreset: this._reset
		};
	},

	redraw: function () {
		if (this._map) {
			this._renderer._updatePath(this);
		}
		return this;
	},

	setStyle: function (style) {
		L.setOptions(this, style);
		if (this._renderer) {
			this._renderer._updateStyle(this);
		}
		return this;
	},

	bringToFront: function () {
		if (this._renderer) {
			this._renderer._bringToFront(this);
		}
		return this;
	},

	bringToBack: function () {
		if (this._renderer) {
			this._renderer._bringToBack(this);
		}
		return this;
	},

	getElement: function () {
		return this._path;
	},

	_reset: function () {
		// defined in children classes
		this._project();
		this._update();
	},

	_clickTolerance: function () {
		// used when doing hit detection for Canvas layers
		return (this.options.stroke ? this.options.weight / 2 : 0) + (L.Browser.touch ? 10 : 0);
	}
});



/*
 * L.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */

L.LineUtil = {

	// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
	// Improves rendering performance dramatically by lessening the number of points to draw.

	simplify: function (points, tolerance) {
		if (!tolerance || !points.length) {
			return points.slice();
		}

		var sqTolerance = tolerance * tolerance;

		// stage 1: vertex reduction
		points = this._reducePoints(points, sqTolerance);

		// stage 2: Douglas-Peucker simplification
		points = this._simplifyDP(points, sqTolerance);

		return points;
	},

	// distance from a point to a segment between two points
	pointToSegmentDistance:  function (p, p1, p2) {
		return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	},

	closestPointOnSegment: function (p, p1, p2) {
		return this._sqClosestPointOnSegment(p, p1, p2);
	},

	// Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
	_simplifyDP: function (points, sqTolerance) {

		var len = points.length,
		    ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
		    markers = new ArrayConstructor(len);

		markers[0] = markers[len - 1] = 1;

		this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

		var i,
		    newPoints = [];

		for (i = 0; i < len; i++) {
			if (markers[i]) {
				newPoints.push(points[i]);
			}
		}

		return newPoints;
	},

	_simplifyDPStep: function (points, markers, sqTolerance, first, last) {

		var maxSqDist = 0,
		    index, i, sqDist;

		for (i = first + 1; i <= last - 1; i++) {
			sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

			if (sqDist > maxSqDist) {
				index = i;
				maxSqDist = sqDist;
			}
		}

		if (maxSqDist > sqTolerance) {
			markers[index] = 1;

			this._simplifyDPStep(points, markers, sqTolerance, first, index);
			this._simplifyDPStep(points, markers, sqTolerance, index, last);
		}
	},

	// reduce points that are too close to each other to a single point
	_reducePoints: function (points, sqTolerance) {
		var reducedPoints = [points[0]];

		for (var i = 1, prev = 0, len = points.length; i < len; i++) {
			if (this._sqDist(points[i], points[prev]) > sqTolerance) {
				reducedPoints.push(points[i]);
				prev = i;
			}
		}
		if (prev < len - 1) {
			reducedPoints.push(points[len - 1]);
		}
		return reducedPoints;
	},

	// Cohen-Sutherland line clipping algorithm.
	// Used to avoid rendering parts of a polyline that are not currently visible.

	clipSegment: function (a, b, bounds, useLastCode, round) {
		var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
		    codeB = this._getBitCode(b, bounds),

		    codeOut, p, newCode;

		// save 2nd code to avoid calculating it on the next segment
		this._lastCode = codeB;

		while (true) {
			// if a,b is inside the clip window (trivial accept)
			if (!(codeA | codeB)) { return [a, b]; }

			// if a,b is outside the clip window (trivial reject)
			if (codeA & codeB) { return false; }

			// other cases
			codeOut = codeA || codeB;
			p = this._getEdgeIntersection(a, b, codeOut, bounds, round);
			newCode = this._getBitCode(p, bounds);

			if (codeOut === codeA) {
				a = p;
				codeA = newCode;
			} else {
				b = p;
				codeB = newCode;
			}
		}
	},

	_getEdgeIntersection: function (a, b, code, bounds, round) {
		var dx = b.x - a.x,
		    dy = b.y - a.y,
		    min = bounds.min,
		    max = bounds.max,
		    x, y;

		if (code & 8) { // top
			x = a.x + dx * (max.y - a.y) / dy;
			y = max.y;

		} else if (code & 4) { // bottom
			x = a.x + dx * (min.y - a.y) / dy;
			y = min.y;

		} else if (code & 2) { // right
			x = max.x;
			y = a.y + dy * (max.x - a.x) / dx;

		} else if (code & 1) { // left
			x = min.x;
			y = a.y + dy * (min.x - a.x) / dx;
		}

		return new L.Point(x, y, round);
	},

	_getBitCode: function (p, bounds) {
		var code = 0;

		if (p.x < bounds.min.x) { // left
			code |= 1;
		} else if (p.x > bounds.max.x) { // right
			code |= 2;
		}

		if (p.y < bounds.min.y) { // bottom
			code |= 4;
		} else if (p.y > bounds.max.y) { // top
			code |= 8;
		}

		return code;
	},

	// square distance (to avoid unnecessary Math.sqrt calls)
	_sqDist: function (p1, p2) {
		var dx = p2.x - p1.x,
		    dy = p2.y - p1.y;
		return dx * dx + dy * dy;
	},

	// return closest point on segment or distance to that point
	_sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
		var x = p1.x,
		    y = p1.y,
		    dx = p2.x - x,
		    dy = p2.y - y,
		    dot = dx * dx + dy * dy,
		    t;

		if (dot > 0) {
			t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

			if (t > 1) {
				x = p2.x;
				y = p2.y;
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}

		dx = p.x - x;
		dy = p.y - y;

		return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
	}
};



/*
 * L.Polyline implements polyline vector layer (a set of points connected with lines)
 */

L.Polyline = L.Path.extend({

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0
		// noClip: false
	},

	initialize: function (latlngs, options) {
		L.setOptions(this, options);
		this._setLatLngs(latlngs);
	},

	getLatLngs: function () {
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._setLatLngs(latlngs);
		return this.redraw();
	},

	isEmpty: function () {
		return !this._latlngs.length;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity,
		    minPoint = null,
		    closest = L.LineUtil._sqClosestPointOnSegment,
		    p1, p2;

		for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
			var points = this._parts[j];

			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];

				var sqDist = closest(p, p1, p2, true);

				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = closest(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getCenter: function () {
		var i, halfDist, segDist, dist, p1, p2, ratio,
		    points = this._rings[0],
		    len = points.length;

		if (!len) { return null; }

		// polyline centroid algorithm; only uses the first ring if there are multiple

		for (i = 0, halfDist = 0; i < len - 1; i++) {
			halfDist += points[i].distanceTo(points[i + 1]) / 2;
		}

		// The line is so small in the current view that all points are on the same pixel.
		if (halfDist === 0) {
			return this._map.layerPointToLatLng(points[0]);
		}

		for (i = 0, dist = 0; i < len - 1; i++) {
			p1 = points[i];
			p2 = points[i + 1];
			segDist = p1.distanceTo(p2);
			dist += segDist;

			if (dist > halfDist) {
				ratio = (dist - halfDist) / segDist;
				return this._map.layerPointToLatLng([
					p2.x - ratio * (p2.x - p1.x),
					p2.y - ratio * (p2.y - p1.y)
				]);
			}
		}
	},

	getBounds: function () {
		return this._bounds;
	},

	addLatLng: function (latlng, latlngs) {
		latlngs = latlngs || this._defaultShape();
		latlng = L.latLng(latlng);
		latlngs.push(latlng);
		this._bounds.extend(latlng);
		return this.redraw();
	},

	_setLatLngs: function (latlngs) {
		this._bounds = new L.LatLngBounds();
		this._latlngs = this._convertLatLngs(latlngs);
	},

	_defaultShape: function () {
		return L.Polyline._flat(this._latlngs) ? this._latlngs : this._latlngs[0];
	},

	// recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
	_convertLatLngs: function (latlngs) {
		var result = [],
		    flat = L.Polyline._flat(latlngs);

		for (var i = 0, len = latlngs.length; i < len; i++) {
			if (flat) {
				result[i] = L.latLng(latlngs[i]);
				this._bounds.extend(result[i]);
			} else {
				result[i] = this._convertLatLngs(latlngs[i]);
			}
		}

		return result;
	},

	_project: function () {
		this._rings = [];
		this._projectLatlngs(this._latlngs, this._rings);

		// project bounds as well to use later for Canvas hit detection/etc.
		var w = this._clickTolerance(),
		    p = new L.Point(w, -w);

		if (this._bounds.isValid()) {
			this._pxBounds = new L.Bounds(
				this._map.latLngToLayerPoint(this._bounds.getSouthWest())._subtract(p),
				this._map.latLngToLayerPoint(this._bounds.getNorthEast())._add(p));
		}
	},

	// recursively turns latlngs into a set of rings with projected coordinates
	_projectLatlngs: function (latlngs, result) {

		var flat = latlngs[0] instanceof L.LatLng,
		    len = latlngs.length,
		    i, ring;

		if (flat) {
			ring = [];
			for (i = 0; i < len; i++) {
				ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
			}
			result.push(ring);
		} else {
			for (i = 0; i < len; i++) {
				this._projectLatlngs(latlngs[i], result);
			}
		}
	},

	// clip polyline by renderer bounds so that we have less to render for performance
	_clipPoints: function () {
		var bounds = this._renderer._bounds;

		this._parts = [];
		if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
			return;
		}

		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		var parts = this._parts,
		    i, j, k, len, len2, segment, points;

		for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
			points = this._rings[i];

			for (j = 0, len2 = points.length; j < len2 - 1; j++) {
				segment = L.LineUtil.clipSegment(points[j], points[j + 1], bounds, j, true);

				if (!segment) { continue; }

				parts[k] = parts[k] || [];
				parts[k].push(segment[0]);

				// if segment goes out of screen, or it's the last one, it's the end of the line part
				if ((segment[1] !== points[j + 1]) || (j === len2 - 2)) {
					parts[k].push(segment[1]);
					k++;
				}
			}
		}
	},

	// simplify each clipped part of the polyline for performance
	_simplifyPoints: function () {
		var parts = this._parts,
		    tolerance = this.options.smoothFactor;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = L.LineUtil.simplify(parts[i], tolerance);
		}
	},

	_update: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();
		this._updatePath();
	},

	_updatePath: function () {
		this._renderer._updatePoly(this);
	}
});

L.polyline = function (latlngs, options) {
	return new L.Polyline(latlngs, options);
};

L.Polyline._flat = function (latlngs) {
	// true if it's a flat array of latlngs; false if nested
	return !L.Util.isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
};



/*
 * L.PolyUtil contains utility functions for polygons (clipping, etc.).
 */

L.PolyUtil = {};

/*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
L.PolyUtil.clipPolygon = function (points, bounds, round) {
	var clippedPoints,
	    edges = [1, 4, 2, 8],
	    i, j, k,
	    a, b,
	    len, edge, p,
	    lu = L.LineUtil;

	for (i = 0, len = points.length; i < len; i++) {
		points[i]._code = lu._getBitCode(points[i], bounds);
	}

	// for each edge (left, bottom, right, top)
	for (k = 0; k < 4; k++) {
		edge = edges[k];
		clippedPoints = [];

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			a = points[i];
			b = points[j];

			// if a is inside the clip window
			if (!(a._code & edge)) {
				// if b is outside the clip window (a->b goes out of screen)
				if (b._code & edge) {
					p = lu._getEdgeIntersection(b, a, edge, bounds, round);
					p._code = lu._getBitCode(p, bounds);
					clippedPoints.push(p);
				}
				clippedPoints.push(a);

			// else if b is inside the clip window (a->b enters the screen)
			} else if (!(b._code & edge)) {
				p = lu._getEdgeIntersection(b, a, edge, bounds, round);
				p._code = lu._getBitCode(p, bounds);
				clippedPoints.push(p);
			}
		}
		points = clippedPoints;
	}

	return points;
};



/*
 * L.Polygon implements polygon vector layer (closed polyline with a fill inside).
 */

L.Polygon = L.Polyline.extend({

	options: {
		fill: true
	},

	isEmpty: function () {
		return !this._latlngs.length || !this._latlngs[0].length;
	},

	getCenter: function () {
		var i, j, p1, p2, f, area, x, y, center,
		    points = this._rings[0],
		    len = points.length;

		if (!len) { return null; }

		// polygon centroid algorithm; only uses the first ring if there are multiple

		area = x = y = 0;

		for (i = 0, j = len - 1; i < len; j = i++) {
			p1 = points[i];
			p2 = points[j];

			f = p1.y * p2.x - p2.y * p1.x;
			x += (p1.x + p2.x) * f;
			y += (p1.y + p2.y) * f;
			area += f * 3;
		}

		if (area === 0) {
			// Polygon is so small that all points are on same pixel.
			center = points[0];
		} else {
			center = [x / area, y / area];
		}
		return this._map.layerPointToLatLng(center);
	},

	_convertLatLngs: function (latlngs) {
		var result = L.Polyline.prototype._convertLatLngs.call(this, latlngs),
		    len = result.length;

		// remove last point if it equals first one
		if (len >= 2 && result[0] instanceof L.LatLng && result[0].equals(result[len - 1])) {
			result.pop();
		}
		return result;
	},

	_setLatLngs: function (latlngs) {
		L.Polyline.prototype._setLatLngs.call(this, latlngs);
		if (L.Polyline._flat(this._latlngs)) {
			this._latlngs = [this._latlngs];
		}
	},

	_defaultShape: function () {
		return L.Polyline._flat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
	},

	_clipPoints: function () {
		// polygons need a different clipping algorithm so we redefine that

		var bounds = this._renderer._bounds,
		    w = this.options.weight,
		    p = new L.Point(w, w);

		// increase clip padding by stroke width to avoid stroke on clip edges
		bounds = new L.Bounds(bounds.min.subtract(p), bounds.max.add(p));

		this._parts = [];
		if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
			return;
		}

		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
			clipped = L.PolyUtil.clipPolygon(this._rings[i], bounds, true);
			if (clipped.length) {
				this._parts.push(clipped);
			}
		}
	},

	_updatePath: function () {
		this._renderer._updatePoly(this, true);
	}
});

L.polygon = function (latlngs, options) {
	return new L.Polygon(latlngs, options);
};



/*
 * L.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
 */

L.Rectangle = L.Polygon.extend({
	initialize: function (latLngBounds, options) {
		L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
	},

	setBounds: function (latLngBounds) {
		return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
	},

	_boundsToLatLngs: function (latLngBounds) {
		latLngBounds = L.latLngBounds(latLngBounds);
		return [
			latLngBounds.getSouthWest(),
			latLngBounds.getNorthWest(),
			latLngBounds.getNorthEast(),
			latLngBounds.getSouthEast()
		];
	}
});

L.rectangle = function (latLngBounds, options) {
	return new L.Rectangle(latLngBounds, options);
};



/*
 * L.CircleMarker is a circle overlay with a permanent pixel radius.
 */

L.CircleMarker = L.Path.extend({

	options: {
		fill: true,
		radius: 10
	},

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
		this._radius = this.options.radius;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		this.redraw();
		return this.fire('move', {latlng: this._latlng});
	},

	getLatLng: function () {
		return this._latlng;
	},

	setRadius: function (radius) {
		this.options.radius = this._radius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._radius;
	},

	setStyle : function (options) {
		var radius = options && options.radius || this._radius;
		L.Path.prototype.setStyle.call(this, options);
		this.setRadius(radius);
		return this;
	},

	_project: function () {
		this._point = this._map.latLngToLayerPoint(this._latlng);
		this._updateBounds();
	},

	_updateBounds: function () {
		var r = this._radius,
		    r2 = this._radiusY || r,
		    w = this._clickTolerance(),
		    p = [r + w, r2 + w];
		this._pxBounds = new L.Bounds(this._point.subtract(p), this._point.add(p));
	},

	_update: function () {
		if (this._map) {
			this._updatePath();
		}
	},

	_updatePath: function () {
		this._renderer._updateCircle(this);
	},

	_empty: function () {
		return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
	}
});

L.circleMarker = function (latlng, options) {
	return new L.CircleMarker(latlng, options);
};



/*
 * L.Circle is a circle overlay (with a certain radius in meters).
 * It's an approximation and starts to diverge from a real circle closer to poles (due to projection distortion)
 */

L.Circle = L.CircleMarker.extend({

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
		this._mRadius = this.options.radius;
	},

	setRadius: function (radius) {
		this._mRadius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._mRadius;
	},

	getBounds: function () {
		var half = [this._radius, this._radiusY || this._radius];

		return new L.LatLngBounds(
			this._map.layerPointToLatLng(this._point.subtract(half)),
			this._map.layerPointToLatLng(this._point.add(half)));
	},

	setStyle: L.Path.prototype.setStyle,

	_project: function () {

		var lng = this._latlng.lng,
		    lat = this._latlng.lat,
		    map = this._map,
		    crs = map.options.crs;

		if (crs.distance === L.CRS.Earth.distance) {
			var d = Math.PI / 180,
			    latR = (this._mRadius / L.CRS.Earth.R) / d,
			    top = map.project([lat + latR, lng]),
			    bottom = map.project([lat - latR, lng]),
			    p = top.add(bottom).divideBy(2),
			    lat2 = map.unproject(p).lat,
			    lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) /
			            (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;

			this._point = p.subtract(map.getPixelOrigin());
			this._radius = isNaN(lngR) ? 0 : Math.max(Math.round(p.x - map.project([lat2, lng - lngR]).x), 1);
			this._radiusY = Math.max(Math.round(p.y - top.y), 1);

		} else {
			var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));

			this._point = map.latLngToLayerPoint(this._latlng);
			this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
		}

		this._updateBounds();
	}
});

L.circle = function (latlng, options, legacyOptions) {
	if (typeof options === 'number') {
		// Backwards compatibility with 0.7.x factory (latlng, radius, options?)
		options = L.extend({}, legacyOptions, {radius: options});
	}
	return new L.Circle(latlng, options);
};



/*
 * L.SVG renders vector layers with SVG. All SVG-specific code goes here.
 */

L.SVG = L.Renderer.extend({

	_initContainer: function () {
		this._container = L.SVG.create('svg');

		// makes it possible to click through svg root; we'll reset it back in individual paths
		this._container.setAttribute('pointer-events', 'none');

		this._rootGroup = L.SVG.create('g');
		this._container.appendChild(this._rootGroup);
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		L.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    size = b.getSize(),
		    container = this._container;

		// set size of svg-container if changed
		if (!this._svgSize || !this._svgSize.equals(size)) {
			this._svgSize = size;
			container.setAttribute('width', size.x);
			container.setAttribute('height', size.y);
		}

		// movement: update container viewBox so that we don't have to change coordinates of individual layers
		L.DomUtil.setPosition(container, b.min);
		container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));
	},

	// methods below are called by vector layers implementations

	_initPath: function (layer) {
		var path = layer._path = L.SVG.create('path');

		if (layer.options.className) {
			L.DomUtil.addClass(path, layer.options.className);
		}

		if (layer.options.interactive) {
			L.DomUtil.addClass(path, 'leaflet-interactive');
		}

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		this._rootGroup.appendChild(layer._path);
		layer.addInteractiveTarget(layer._path);
	},

	_removePath: function (layer) {
		L.DomUtil.remove(layer._path);
		layer.removeInteractiveTarget(layer._path);
	},

	_updatePath: function (layer) {
		layer._project();
		layer._update();
	},

	_updateStyle: function (layer) {
		var path = layer._path,
		    options = layer.options;

		if (!path) { return; }

		if (options.stroke) {
			path.setAttribute('stroke', options.color);
			path.setAttribute('stroke-opacity', options.opacity);
			path.setAttribute('stroke-width', options.weight);
			path.setAttribute('stroke-linecap', options.lineCap);
			path.setAttribute('stroke-linejoin', options.lineJoin);

			if (options.dashArray) {
				path.setAttribute('stroke-dasharray', options.dashArray);
			} else {
				path.removeAttribute('stroke-dasharray');
			}

			if (options.dashOffset) {
				path.setAttribute('stroke-dashoffset', options.dashOffset);
			} else {
				path.removeAttribute('stroke-dashoffset');
			}
		} else {
			path.setAttribute('stroke', 'none');
		}

		if (options.fill) {
			path.setAttribute('fill', options.fillColor || options.color);
			path.setAttribute('fill-opacity', options.fillOpacity);
			path.setAttribute('fill-rule', options.fillRule || 'evenodd');
		} else {
			path.setAttribute('fill', 'none');
		}

		path.setAttribute('pointer-events', options.pointerEvents || (options.interactive ? 'visiblePainted' : 'none'));
	},

	_updatePoly: function (layer, closed) {
		this._setPath(layer, L.SVG.pointsToPath(layer._parts, closed));
	},

	_updateCircle: function (layer) {
		var p = layer._point,
		    r = layer._radius,
		    r2 = layer._radiusY || r,
		    arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

		// drawing a circle with two half-arcs
		var d = layer._empty() ? 'M0 0' :
				'M' + (p.x - r) + ',' + p.y +
				arc + (r * 2) + ',0 ' +
				arc + (-r * 2) + ',0 ';

		this._setPath(layer, d);
	},

	_setPath: function (layer, path) {
		layer._path.setAttribute('d', path);
	},

	// SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
	_bringToFront: function (layer) {
		L.DomUtil.toFront(layer._path);
	},

	_bringToBack: function (layer) {
		L.DomUtil.toBack(layer._path);
	}
});


L.extend(L.SVG, {
	create: function (name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	},

	// generates SVG path string for multiple rings, with each ring turning into "M..L..L.." instructions
	pointsToPath: function (rings, closed) {
		var str = '',
		    i, j, len, len2, points, p;

		for (i = 0, len = rings.length; i < len; i++) {
			points = rings[i];

			for (j = 0, len2 = points.length; j < len2; j++) {
				p = points[j];
				str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
			}

			// closes the ring for polygons; "x" is VML syntax
			str += closed ? (L.Browser.svg ? 'z' : 'x') : '';
		}

		// SVG complains about empty path strings
		return str || 'M0 0';
	}
});

L.Browser.svg = !!(document.createElementNS && L.SVG.create('svg').createSVGRect);

L.svg = function (options) {
	return L.Browser.svg || L.Browser.vml ? new L.SVG(options) : null;
};



/*
 * Vector rendering for IE7-8 through VML.
 * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
 */

L.Browser.vml = !L.Browser.svg && (function () {
	try {
		var div = document.createElement('div');
		div.innerHTML = '<v:shape adj="1"/>';

		var shape = div.firstChild;
		shape.style.behavior = 'url(#default#VML)';

		return shape && (typeof shape.adj === 'object');

	} catch (e) {
		return false;
	}
}());

// redefine some SVG methods to handle VML syntax which is similar but with some differences
L.SVG.include(!L.Browser.vml ? {} : {

	_initContainer: function () {
		this._container = L.DomUtil.create('div', 'leaflet-vml-container');
	},

	_update: function () {
		if (this._map._animatingZoom) { return; }
		L.Renderer.prototype._update.call(this);
	},

	_initPath: function (layer) {
		var container = layer._container = L.SVG.create('shape');

		L.DomUtil.addClass(container, 'leaflet-vml-shape ' + (this.options.className || ''));

		container.coordsize = '1 1';

		layer._path = L.SVG.create('path');
		container.appendChild(layer._path);

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		var container = layer._container;
		this._container.appendChild(container);

		if (layer.options.interactive) {
			layer.addInteractiveTarget(container);
		}
	},

	_removePath: function (layer) {
		var container = layer._container;
		L.DomUtil.remove(container);
		layer.removeInteractiveTarget(container);
	},

	_updateStyle: function (layer) {
		var stroke = layer._stroke,
		    fill = layer._fill,
		    options = layer.options,
		    container = layer._container;

		container.stroked = !!options.stroke;
		container.filled = !!options.fill;

		if (options.stroke) {
			if (!stroke) {
				stroke = layer._stroke = L.SVG.create('stroke');
			}
			container.appendChild(stroke);
			stroke.weight = options.weight + 'px';
			stroke.color = options.color;
			stroke.opacity = options.opacity;

			if (options.dashArray) {
				stroke.dashStyle = L.Util.isArray(options.dashArray) ?
				    options.dashArray.join(' ') :
				    options.dashArray.replace(/( *, *)/g, ' ');
			} else {
				stroke.dashStyle = '';
			}
			stroke.endcap = options.lineCap.replace('butt', 'flat');
			stroke.joinstyle = options.lineJoin;

		} else if (stroke) {
			container.removeChild(stroke);
			layer._stroke = null;
		}

		if (options.fill) {
			if (!fill) {
				fill = layer._fill = L.SVG.create('fill');
			}
			container.appendChild(fill);
			fill.color = options.fillColor || options.color;
			fill.opacity = options.fillOpacity;

		} else if (fill) {
			container.removeChild(fill);
			layer._fill = null;
		}
	},

	_updateCircle: function (layer) {
		var p = layer._point.round(),
		    r = Math.round(layer._radius),
		    r2 = Math.round(layer._radiusY || r);

		this._setPath(layer, layer._empty() ? 'M0 0' :
				'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + (65535 * 360));
	},

	_setPath: function (layer, path) {
		layer._path.v = path;
	},

	_bringToFront: function (layer) {
		L.DomUtil.toFront(layer._container);
	},

	_bringToBack: function (layer) {
		L.DomUtil.toBack(layer._container);
	}
});

if (L.Browser.vml) {
	L.SVG.create = (function () {
		try {
			document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
			return function (name) {
				return document.createElement('<lvml:' + name + ' class="lvml">');
			};
		} catch (e) {
			return function (name) {
				return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
			};
		}
	})();
}



/*
 * L.Canvas handles Canvas vector layers rendering and mouse events handling. All Canvas-specific code goes here.
 */

L.Canvas = L.Renderer.extend({

	onAdd: function () {
		L.Renderer.prototype.onAdd.call(this);

		this._layers = this._layers || {};

		// Redraw vectors since canvas is cleared upon removal,
		// in case of removing the renderer itself from the map.
		this._draw();
	},

	_initContainer: function () {
		var container = this._container = document.createElement('canvas');

		L.DomEvent
			.on(container, 'mousemove', L.Util.throttle(this._onMouseMove, 32, this), this)
			.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this)
			.on(container, 'mouseout', this._handleMouseOut, this);

		this._ctx = container.getContext('2d');
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		this._drawnLayers = {};

		L.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    container = this._container,
		    size = b.getSize(),
		    m = L.Browser.retina ? 2 : 1;

		L.DomUtil.setPosition(container, b.min);

		// set canvas size (also clearing it); use double size on retina
		container.width = m * size.x;
		container.height = m * size.y;
		container.style.width = size.x + 'px';
		container.style.height = size.y + 'px';

		if (L.Browser.retina) {
			this._ctx.scale(2, 2);
		}

		// translate so we use the same path coordinates after canvas element moves
		this._ctx.translate(-b.min.x, -b.min.y);
	},

	_initPath: function (layer) {
		this._layers[L.stamp(layer)] = layer;
	},

	_addPath: L.Util.falseFn,

	_removePath: function (layer) {
		layer._removed = true;
		this._requestRedraw(layer);
	},

	_updatePath: function (layer) {
		this._redrawBounds = layer._pxBounds;
		this._draw(true);
		layer._project();
		layer._update();
		this._draw();
		this._redrawBounds = null;
	},

	_updateStyle: function (layer) {
		this._requestRedraw(layer);
	},

	_requestRedraw: function (layer) {
		if (!this._map) { return; }

		var padding = (layer.options.weight || 0) + 1;
		this._redrawBounds = this._redrawBounds || new L.Bounds();
		this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
		this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));

		this._redrawRequest = this._redrawRequest || L.Util.requestAnimFrame(this._redraw, this);
	},

	_redraw: function () {
		this._redrawRequest = null;

		this._draw(true); // clear layers in redraw bounds
		this._draw(); // draw layers

		this._redrawBounds = null;
	},

	_draw: function (clear) {
		this._clear = clear;
		var layer, bounds = this._redrawBounds;
		this._ctx.save();
		if (bounds) {
			this._ctx.beginPath();
			this._ctx.rect(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
			this._ctx.clip();
		}

		for (var id in this._layers) {
			layer = this._layers[id];
			if (!bounds || layer._pxBounds.intersects(bounds)) {
				layer._updatePath();
			}
			if (clear && layer._removed) {
				delete layer._removed;
				delete this._layers[id];
			}
		}
		this._ctx.restore();  // Restore state before clipping.
	},

	_updatePoly: function (layer, closed) {

		var i, j, len2, p,
		    parts = layer._parts,
		    len = parts.length,
		    ctx = this._ctx;

		if (!len) { return; }

		this._drawnLayers[layer._leaflet_id] = layer;

		ctx.beginPath();

		for (i = 0; i < len; i++) {
			for (j = 0, len2 = parts[i].length; j < len2; j++) {
				p = parts[i][j];
				ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
			}
			if (closed) {
				ctx.closePath();
			}
		}

		this._fillStroke(ctx, layer);

		// TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
	},

	_updateCircle: function (layer) {

		if (layer._empty()) { return; }

		var p = layer._point,
		    ctx = this._ctx,
		    r = layer._radius,
		    s = (layer._radiusY || r) / r;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		ctx.beginPath();
		ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

		if (s !== 1) {
			ctx.restore();
		}

		this._fillStroke(ctx, layer);
	},

	_fillStroke: function (ctx, layer) {
		var clear = this._clear,
		    options = layer.options;

		ctx.globalCompositeOperation = clear ? 'destination-out' : 'source-over';

		if (options.fill) {
			ctx.globalAlpha = clear ? 1 : options.fillOpacity;
			ctx.fillStyle = options.fillColor || options.color;
			ctx.fill(options.fillRule || 'evenodd');
		}

		if (options.stroke && options.weight !== 0) {
			ctx.globalAlpha = clear ? 1 : options.opacity;

			// if clearing shape, do it with the previously drawn line width
			layer._prevWeight = ctx.lineWidth = clear ? layer._prevWeight + 1 : options.weight;

			ctx.strokeStyle = options.color;
			ctx.lineCap = options.lineCap;
			ctx.lineJoin = options.lineJoin;
			ctx.stroke();
		}
	},

	// Canvas obviously doesn't have mouse events for individual drawn objects,
	// so we emulate that by calculating what's under the mouse on mousemove/click manually

	_onClick: function (e) {
		var point = this._map.mouseEventToLayerPoint(e), layers = [];

		for (var id in this._layers) {
			if (this._layers[id]._containsPoint(point)) {
				L.DomEvent._fakeStop(e);
				layers.push(this._layers[id]);
			}
		}
		if (layers.length)  {
			this._fireEvent(layers, e);
		}
	},

	_onMouseMove: function (e) {
		if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) { return; }

		var point = this._map.mouseEventToLayerPoint(e);
		this._handleMouseOut(e, point);
		this._handleMouseHover(e, point);
	},


	_handleMouseOut: function (e, point) {
		var layer = this._hoveredLayer;
		if (layer && (e.type === 'mouseout' || !layer._containsPoint(point))) {
			// if we're leaving the layer, fire mouseout
			L.DomUtil.removeClass(this._container, 'leaflet-interactive');
			this._fireEvent([layer], e, 'mouseout');
			this._hoveredLayer = null;
		}
	},

	_handleMouseHover: function (e, point) {
		var id, layer;
		if (!this._hoveredLayer) {
			for (id in this._drawnLayers) {
				layer = this._drawnLayers[id];
				if (layer.options.interactive && layer._containsPoint(point)) {
					L.DomUtil.addClass(this._container, 'leaflet-interactive'); // change cursor
					this._fireEvent([layer], e, 'mouseover');
					this._hoveredLayer = layer;
					break;
				}
			}
		}
		if (this._hoveredLayer) {
			this._fireEvent([this._hoveredLayer], e);
		}
	},

	_fireEvent: function (layers, e, type) {
		this._map._fireDOMEvent(e, type || e.type, layers);
	},

	// TODO _bringToFront & _bringToBack, pretty tricky

	_bringToFront: L.Util.falseFn,
	_bringToBack: L.Util.falseFn
});

L.Browser.canvas = (function () {
	return !!document.createElement('canvas').getContext;
}());

L.canvas = function (options) {
	return L.Browser.canvas ? new L.Canvas(options) : null;
};

L.Polyline.prototype._containsPoint = function (p, closed) {
	var i, j, k, len, len2, part,
	    w = this._clickTolerance();

	if (!this._pxBounds.contains(p)) { return false; }

	// hit detection for polylines
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			if (!closed && (j === 0)) { continue; }

			if (L.LineUtil.pointToSegmentDistance(p, part[k], part[j]) <= w) {
				return true;
			}
		}
	}
	return false;
};

L.Polygon.prototype._containsPoint = function (p) {
	var inside = false,
	    part, p1, p2, i, j, k, len, len2;

	if (!this._pxBounds.contains(p)) { return false; }

	// ray casting algorithm for detecting if point is in polygon
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			p1 = part[j];
			p2 = part[k];

			if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
				inside = !inside;
			}
		}
	}

	// also check if it's on polygon stroke
	return inside || L.Polyline.prototype._containsPoint.call(this, p, true);
};

L.CircleMarker.prototype._containsPoint = function (p) {
	return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
};



/*
 * L.GeoJSON turns any GeoJSON data into a Leaflet layer.
 */

L.GeoJSON = L.FeatureGroup.extend({

	initialize: function (geojson, options) {
		L.setOptions(this, options);

		this._layers = {};

		if (geojson) {
			this.addData(geojson);
		}
	},

	addData: function (geojson) {
		var features = L.Util.isArray(geojson) ? geojson : geojson.features,
		    i, len, feature;

		if (features) {
			for (i = 0, len = features.length; i < len; i++) {
				// only add this if geometry or geometries are set and not null
				feature = features[i];
				if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
					this.addData(feature);
				}
			}
			return this;
		}

		var options = this.options;

		if (options.filter && !options.filter(geojson)) { return this; }

		var layer = L.GeoJSON.geometryToLayer(geojson, options);
		if (!layer) {
			return this;
		}
		layer.feature = L.GeoJSON.asFeature(geojson);

		layer.defaultOptions = layer.options;
		this.resetStyle(layer);

		if (options.onEachFeature) {
			options.onEachFeature(geojson, layer);
		}

		return this.addLayer(layer);
	},

	resetStyle: function (layer) {
		// reset any custom styles
		layer.options = layer.defaultOptions;
		this._setLayerStyle(layer, this.options.style);
		return this;
	},

	setStyle: function (style) {
		return this.eachLayer(function (layer) {
			this._setLayerStyle(layer, style);
		}, this);
	},

	_setLayerStyle: function (layer, style) {
		if (typeof style === 'function') {
			style = style(layer.feature);
		}
		if (layer.setStyle) {
			layer.setStyle(style);
		}
	}
});

L.extend(L.GeoJSON, {
	geometryToLayer: function (geojson, options) {

		var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
		    coords = geometry ? geometry.coordinates : null,
		    layers = [],
		    pointToLayer = options && options.pointToLayer,
		    coordsToLatLng = options && options.coordsToLatLng || this.coordsToLatLng,
		    latlng, latlngs, i, len;

		if (!coords && !geometry) {
			return null;
		}

		switch (geometry.type) {
		case 'Point':
			latlng = coordsToLatLng(coords);
			return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

		case 'MultiPoint':
			for (i = 0, len = coords.length; i < len; i++) {
				latlng = coordsToLatLng(coords[i]);
				layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng));
			}
			return new L.FeatureGroup(layers);

		case 'LineString':
		case 'MultiLineString':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, coordsToLatLng);
			return new L.Polyline(latlngs, options);

		case 'Polygon':
		case 'MultiPolygon':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, coordsToLatLng);
			return new L.Polygon(latlngs, options);

		case 'GeometryCollection':
			for (i = 0, len = geometry.geometries.length; i < len; i++) {
				var layer = this.geometryToLayer({
					geometry: geometry.geometries[i],
					type: 'Feature',
					properties: geojson.properties
				}, options);

				if (layer) {
					layers.push(layer);
				}
			}
			return new L.FeatureGroup(layers);

		default:
			throw new Error('Invalid GeoJSON object.');
		}
	},

	coordsToLatLng: function (coords) {
		return new L.LatLng(coords[1], coords[0], coords[2]);
	},

	coordsToLatLngs: function (coords, levelsDeep, coordsToLatLng) {
		var latlngs = [];

		for (var i = 0, len = coords.length, latlng; i < len; i++) {
			latlng = levelsDeep ?
			        this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
			        (coordsToLatLng || this.coordsToLatLng)(coords[i]);

			latlngs.push(latlng);
		}

		return latlngs;
	},

	latLngToCoords: function (latlng) {
		return latlng.alt !== undefined ?
				[latlng.lng, latlng.lat, latlng.alt] :
				[latlng.lng, latlng.lat];
	},

	latLngsToCoords: function (latlngs, levelsDeep, closed) {
		var coords = [];

		for (var i = 0, len = latlngs.length; i < len; i++) {
			coords.push(levelsDeep ?
				L.GeoJSON.latLngsToCoords(latlngs[i], levelsDeep - 1, closed) :
				L.GeoJSON.latLngToCoords(latlngs[i]));
		}

		if (!levelsDeep && closed) {
			coords.push(coords[0]);
		}

		return coords;
	},

	getFeature: function (layer, newGeometry) {
		return layer.feature ?
				L.extend({}, layer.feature, {geometry: newGeometry}) :
				L.GeoJSON.asFeature(newGeometry);
	},

	asFeature: function (geoJSON) {
		if (geoJSON.type === 'Feature') {
			return geoJSON;
		}

		return {
			type: 'Feature',
			properties: {},
			geometry: geoJSON
		};
	}
});

var PointToGeoJSON = {
	toGeoJSON: function () {
		return L.GeoJSON.getFeature(this, {
			type: 'Point',
			coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
		});
	}
};

L.Marker.include(PointToGeoJSON);
L.Circle.include(PointToGeoJSON);
L.CircleMarker.include(PointToGeoJSON);

L.Polyline.prototype.toGeoJSON = function () {
	var multi = !L.Polyline._flat(this._latlngs);

	var coords = L.GeoJSON.latLngsToCoords(this._latlngs, multi ? 1 : 0);

	return L.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'LineString',
		coordinates: coords
	});
};

L.Polygon.prototype.toGeoJSON = function () {
	var holes = !L.Polyline._flat(this._latlngs),
	    multi = holes && !L.Polyline._flat(this._latlngs[0]);

	var coords = L.GeoJSON.latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true);

	if (!holes) {
		coords = [coords];
	}

	return L.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'Polygon',
		coordinates: coords
	});
};


L.LayerGroup.include({
	toMultiPoint: function () {
		var coords = [];

		this.eachLayer(function (layer) {
			coords.push(layer.toGeoJSON().geometry.coordinates);
		});

		return L.GeoJSON.getFeature(this, {
			type: 'MultiPoint',
			coordinates: coords
		});
	},

	toGeoJSON: function () {

		var type = this.feature && this.feature.geometry && this.feature.geometry.type;

		if (type === 'MultiPoint') {
			return this.toMultiPoint();
		}

		var isGeometryCollection = type === 'GeometryCollection',
		    jsons = [];

		this.eachLayer(function (layer) {
			if (layer.toGeoJSON) {
				var json = layer.toGeoJSON();
				jsons.push(isGeometryCollection ? json.geometry : L.GeoJSON.asFeature(json));
			}
		});

		if (isGeometryCollection) {
			return L.GeoJSON.getFeature(this, {
				geometries: jsons,
				type: 'GeometryCollection'
			});
		}

		return {
			type: 'FeatureCollection',
			features: jsons
		};
	}
});

L.geoJson = function (geojson, options) {
	return new L.GeoJSON(geojson, options);
};



/*
 * L.DomEvent contains functions for working with DOM events.
 * Inspired by John Resig, Dean Edwards and YUI addEvent implementations.
 */

var eventsKey = '_leaflet_events';

L.DomEvent = {

	on: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._on(obj, type, types[type], fn);
			}
		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(obj, types[i], fn, context);
			}
		}

		return this;
	},

	off: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._off(obj, type, types[type], fn);
			}
		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(obj, types[i], fn, context);
			}
		}

		return this;
	},

	_on: function (obj, type, fn, context) {
		var id = type + L.stamp(fn) + (context ? '_' + L.stamp(context) : '');

		if (obj[eventsKey] && obj[eventsKey][id]) { return this; }

		var handler = function (e) {
			return fn.call(context || obj, e || window.event);
		};

		var originalHandler = handler;

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			this.addPointerListener(obj, type, handler, id);

		} else if (L.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);

		} else if ('addEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {
				handler = function (e) {
					e = e || window.event;
					if (L.DomEvent._isExternalTarget(obj, e)) {
						originalHandler(e);
					}
				};
				obj.addEventListener(type === 'mouseenter' ? 'mouseover' : 'mouseout', handler, false);

			} else {
				if (type === 'click' && L.Browser.android) {
					handler = function (e) {
						return L.DomEvent._filterClick(e, originalHandler);
					};
				}
				obj.addEventListener(type, handler, false);
			}

		} else if ('attachEvent' in obj) {
			obj.attachEvent('on' + type, handler);
		}

		obj[eventsKey] = obj[eventsKey] || {};
		obj[eventsKey][id] = handler;

		return this;
	},

	_off: function (obj, type, fn, context) {

		var id = type + L.stamp(fn) + (context ? '_' + L.stamp(context) : ''),
		    handler = obj[eventsKey] && obj[eventsKey][id];

		if (!handler) { return this; }

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			this.removePointerListener(obj, type, id);

		} else if (L.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);

		} else if ('removeEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);

			} else {
				obj.removeEventListener(
					type === 'mouseenter' ? 'mouseover' :
					type === 'mouseleave' ? 'mouseout' : type, handler, false);
			}

		} else if ('detachEvent' in obj) {
			obj.detachEvent('on' + type, handler);
		}

		obj[eventsKey][id] = null;

		return this;
	},

	stopPropagation: function (e) {

		if (e.stopPropagation) {
			e.stopPropagation();
		} else if (e.originalEvent) {  // In case of Leaflet event.
			e.originalEvent._stopped = true;
		} else {
			e.cancelBubble = true;
		}
		L.DomEvent._skipped(e);

		return this;
	},

	disableScrollPropagation: function (el) {
		return L.DomEvent.on(el, 'mousewheel MozMousePixelScroll', L.DomEvent.stopPropagation);
	},

	disableClickPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		L.DomEvent.on(el, L.Draggable.START.join(' '), stop);

		return L.DomEvent.on(el, {
			click: L.DomEvent._fakeStop,
			dblclick: stop
		});
	},

	preventDefault: function (e) {

		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		return this;
	},

	stop: function (e) {
		return L.DomEvent
			.preventDefault(e)
			.stopPropagation(e);
	},

	getMousePosition: function (e, container) {
		if (!container) {
			return new L.Point(e.clientX, e.clientY);
		}

		var rect = container.getBoundingClientRect();

		return new L.Point(
			e.clientX - rect.left - container.clientLeft,
			e.clientY - rect.top - container.clientTop);
	},

	getWheelDelta: function (e) {

		var delta = 0;

		if (e.wheelDelta) {
			delta = e.wheelDelta / 120;
		}
		if (e.detail) {
			delta = -e.detail / 3;
		}
		return delta;
	},

	_skipEvents: {},

	_fakeStop: function (e) {
		// fakes stopPropagation by setting a special event flag, checked/reset with L.DomEvent._skipped(e)
		L.DomEvent._skipEvents[e.type] = true;
	},

	_skipped: function (e) {
		var skipped = this._skipEvents[e.type];
		// reset when checking, as it's only used in map container and propagates outside of the map
		this._skipEvents[e.type] = false;
		return skipped;
	},

	// check if element really left/entered the event target (for mouseenter/mouseleave)
	_isExternalTarget: function (el, e) {

		var related = e.relatedTarget;

		if (!related) { return true; }

		try {
			while (related && (related !== el)) {
				related = related.parentNode;
			}
		} catch (err) {
			return false;
		}
		return (related !== el);
	},

	// this is a horrible workaround for a bug in Android where a single touch triggers two click events
	_filterClick: function (e, handler) {
		var timeStamp = (e.timeStamp || e.originalEvent.timeStamp),
		    elapsed = L.DomEvent._lastClick && (timeStamp - L.DomEvent._lastClick);

		// are they closer together than 500ms yet more than 100ms?
		// Android typically triggers them ~300ms apart while multiple listeners
		// on the same event should be triggered far faster;
		// or check if click is simulated on the element, and if it is, reject any non-simulated events

		if ((elapsed && elapsed > 100 && elapsed < 500) || (e.target._simulatedClick && !e._simulated)) {
			L.DomEvent.stop(e);
			return;
		}
		L.DomEvent._lastClick = timeStamp;

		handler(e);
	}
};

L.DomEvent.addListener = L.DomEvent.on;
L.DomEvent.removeListener = L.DomEvent.off;



/*
 * L.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */

L.Draggable = L.Evented.extend({

	statics: {
		START: L.Browser.touch ? ['touchstart', 'mousedown'] : ['mousedown'],
		END: {
			mousedown: 'mouseup',
			touchstart: 'touchend',
			pointerdown: 'touchend',
			MSPointerDown: 'touchend'
		},
		MOVE: {
			mousedown: 'mousemove',
			touchstart: 'touchmove',
			pointerdown: 'touchmove',
			MSPointerDown: 'touchmove'
		}
	},

	initialize: function (element, dragStartTarget, preventOutline) {
		this._element = element;
		this._dragStartTarget = dragStartTarget || element;
		this._preventOutline = preventOutline;
	},

	enable: function () {
		if (this._enabled) { return; }

		L.DomEvent.on(this._dragStartTarget, L.Draggable.START.join(' '), this._onDown, this);

		this._enabled = true;
	},

	disable: function () {
		if (!this._enabled) { return; }

		L.DomEvent.off(this._dragStartTarget, L.Draggable.START.join(' '), this._onDown, this);

		this._enabled = false;
		this._moved = false;
	},

	_onDown: function (e) {
		this._moved = false;

		if (L.DomUtil.hasClass(this._element, 'leaflet-zoom-anim')) { return; }

		if (L.Draggable._dragging || e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches) || !this._enabled) { return; }
		L.Draggable._dragging = true;  // Prevent dragging multiple objects at once.

		if (this._preventOutline) {
			L.DomUtil.preventOutline(this._element);
		}

		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		if (this._moving) { return; }

		this.fire('down');

		var first = e.touches ? e.touches[0] : e;

		this._startPoint = new L.Point(first.clientX, first.clientY);
		this._startPos = this._newPos = L.DomUtil.getPosition(this._element);

		L.DomEvent
		    .on(document, L.Draggable.MOVE[e.type], this._onMove, this)
		    .on(document, L.Draggable.END[e.type], this._onUp, this);
	},

	_onMove: function (e) {
		if (e.touches && e.touches.length > 1) {
			this._moved = true;
			return;
		}

		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
		    newPoint = new L.Point(first.clientX, first.clientY),
		    offset = newPoint.subtract(this._startPoint);

		if (!offset.x && !offset.y) { return; }
		if (L.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) { return; }

		L.DomEvent.preventDefault(e);

		if (!this._moved) {
			this.fire('dragstart');

			this._moved = true;
			this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);

			L.DomUtil.addClass(document.body, 'leaflet-dragging');

			this._lastTarget = e.target || e.srcElement;
			L.DomUtil.addClass(this._lastTarget, 'leaflet-drag-target');
		}

		this._newPos = this._startPos.add(offset);
		this._moving = true;

		L.Util.cancelAnimFrame(this._animRequest);
		this._lastEvent = e;
		this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true);
	},

	_updatePosition: function () {
		var e = {originalEvent: this._lastEvent};
		this.fire('predrag', e);
		L.DomUtil.setPosition(this._element, this._newPos);
		this.fire('drag', e);
	},

	_onUp: function () {
		L.DomUtil.removeClass(document.body, 'leaflet-dragging');

		if (this._lastTarget) {
			L.DomUtil.removeClass(this._lastTarget, 'leaflet-drag-target');
			this._lastTarget = null;
		}

		for (var i in L.Draggable.MOVE) {
			L.DomEvent
			    .off(document, L.Draggable.MOVE[i], this._onMove, this)
			    .off(document, L.Draggable.END[i], this._onUp, this);
		}

		L.DomUtil.enableImageDrag();
		L.DomUtil.enableTextSelection();

		if (this._moved && this._moving) {
			// ensure drag is not fired after dragend
			L.Util.cancelAnimFrame(this._animRequest);

			this.fire('dragend', {
				distance: this._newPos.distanceTo(this._startPos)
			});
		}

		this._moving = false;
		L.Draggable._dragging = false;
	}
});



/*
	L.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

L.Handler = L.Class.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});



/*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

L.Map.mergeOptions({
	dragging: true,

	inertia: !L.Browser.android23,
	inertiaDeceleration: 3400, // px/s^2
	inertiaMaxSpeed: Infinity, // px/s
	easeLinearity: 0.2,

	// TODO refactor, move to CRS
	worldCopyJump: false
});

L.Map.Drag = L.Handler.extend({
	addHooks: function () {
		if (!this._draggable) {
			var map = this._map;

			this._draggable = new L.Draggable(map._mapPane, map._container);

			this._draggable.on({
				down: this._onDown,
				dragstart: this._onDragStart,
				drag: this._onDrag,
				dragend: this._onDragEnd
			}, this);

			this._draggable.on('predrag', this._onPreDragLimit, this);
			if (map.options.worldCopyJump) {
				this._draggable.on('predrag', this._onPreDragWrap, this);
				map.on('zoomend', this._onZoomEnd, this);

				map.whenReady(this._onZoomEnd, this);
			}
		}
		L.DomUtil.addClass(this._map._container, 'leaflet-grab');
		this._draggable.enable();
	},

	removeHooks: function () {
		L.DomUtil.removeClass(this._map._container, 'leaflet-grab');
		this._draggable.disable();
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDown: function () {
		this._map.stop();
	},

	_onDragStart: function () {
		var map = this._map;

		if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
			var bounds = L.latLngBounds(this._map.options.maxBounds);

			this._offsetLimit = L.bounds(
				this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
				this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1)
					.add(this._map.getSize()));

			this._viscosity = Math.min(1.0, Math.max(0.0, this._map.options.maxBoundsViscosity));
		} else {
			this._offsetLimit = null;
		}

		map
		    .fire('movestart')
		    .fire('dragstart');

		if (map.options.inertia) {
			this._positions = [];
			this._times = [];
		}
	},

	_onDrag: function (e) {
		if (this._map.options.inertia) {
			var time = this._lastTime = +new Date(),
			    pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;

			this._positions.push(pos);
			this._times.push(time);

			if (time - this._times[0] > 50) {
				this._positions.shift();
				this._times.shift();
			}
		}

		this._map
		    .fire('move', e)
		    .fire('drag', e);
	},

	_onZoomEnd: function () {
		var pxCenter = this._map.getSize().divideBy(2),
		    pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

		this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
		this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
	},

	_viscousLimit: function (value, threshold) {
		return value - (value - threshold) * this._viscosity;
	},

	_onPreDragLimit: function () {
		if (!this._viscosity || !this._offsetLimit) { return; }

		var offset = this._draggable._newPos.subtract(this._draggable._startPos);

		var limit = this._offsetLimit;
		if (offset.x < limit.min.x) { offset.x = this._viscousLimit(offset.x, limit.min.x); }
		if (offset.y < limit.min.y) { offset.y = this._viscousLimit(offset.y, limit.min.y); }
		if (offset.x > limit.max.x) { offset.x = this._viscousLimit(offset.x, limit.max.x); }
		if (offset.y > limit.max.y) { offset.y = this._viscousLimit(offset.y, limit.max.y); }

		this._draggable._newPos = this._draggable._startPos.add(offset);
	},

	_onPreDragWrap: function () {
		// TODO refactor to be able to adjust map pane position after zoom
		var worldWidth = this._worldWidth,
		    halfWidth = Math.round(worldWidth / 2),
		    dx = this._initialWorldOffset,
		    x = this._draggable._newPos.x,
		    newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
		    newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
		    newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

		this._draggable._absPos = this._draggable._newPos.clone();
		this._draggable._newPos.x = newX;
	},

	_onDragEnd: function (e) {
		var map = this._map,
		    options = map.options,

		    noInertia = !options.inertia || this._times.length < 2;

		map.fire('dragend', e);

		if (noInertia) {
			map.fire('moveend');

		} else {

			var direction = this._lastPos.subtract(this._positions[0]),
			    duration = (this._lastTime - this._times[0]) / 1000,
			    ease = options.easeLinearity,

			    speedVector = direction.multiplyBy(ease / duration),
			    speed = speedVector.distanceTo([0, 0]),

			    limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
			    limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

			    decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
			    offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

			if (!offset.x && !offset.y) {
				map.fire('moveend');

			} else {
				offset = map._limitOffset(offset, map.options.maxBounds);

				L.Util.requestAnimFrame(function () {
					map.panBy(offset, {
						duration: decelerationDuration,
						easeLinearity: ease,
						noMoveStart: true,
						animate: true
					});
				});
			}
		}
	}
});

L.Map.addInitHook('addHandler', 'dragging', L.Map.Drag);



/*
 * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */

L.Map.mergeOptions({
	doubleClickZoom: true
});

L.Map.DoubleClickZoom = L.Handler.extend({
	addHooks: function () {
		this._map.on('dblclick', this._onDoubleClick, this);
	},

	removeHooks: function () {
		this._map.off('dblclick', this._onDoubleClick, this);
	},

	_onDoubleClick: function (e) {
		var map = this._map,
		    oldZoom = map.getZoom(),
		    zoom = e.originalEvent.shiftKey ? Math.ceil(oldZoom) - 1 : Math.floor(oldZoom) + 1;

		if (map.options.doubleClickZoom === 'center') {
			map.setZoom(zoom);
		} else {
			map.setZoomAround(e.containerPoint, zoom);
		}
	}
});

L.Map.addInitHook('addHandler', 'doubleClickZoom', L.Map.DoubleClickZoom);



/*
 * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
 */

L.Map.mergeOptions({
	scrollWheelZoom: true,
	wheelDebounceTime: 40
});

L.Map.ScrollWheelZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: L.DomEvent.preventDefault
		}, this);

		this._delta = 0;
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: L.DomEvent.preventDefault
		}, this);
	},

	_onWheelScroll: function (e) {
		var delta = L.DomEvent.getWheelDelta(e);
		var debounce = this._map.options.wheelDebounceTime;

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(debounce - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(L.bind(this._performZoom, this), left);

		L.DomEvent.stop(e);
	},

	_performZoom: function () {
		var map = this._map,
		    delta = this._delta,
		    zoom = map.getZoom();

		map.stop(); // stop panning and fly animations if any

		delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
		delta = Math.max(Math.min(delta, 4), -4);
		delta = map._limitZoom(zoom + delta) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
});

L.Map.addInitHook('addHandler', 'scrollWheelZoom', L.Map.ScrollWheelZoom);



/*
 * Extends the event handling code with double tap support for mobile browsers.
 */

L.extend(L.DomEvent, {

	_touchstart: L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart',
	_touchend: L.Browser.msPointer ? 'MSPointerUp' : L.Browser.pointer ? 'pointerup' : 'touchend',

	// inspired by Zepto touch code by Thomas Fuchs
	addDoubleTapListener: function (obj, handler, id) {
		var last, touch,
		    doubleTap = false,
		    delay = 250;

		function onTouchStart(e) {
			var count;

			if (L.Browser.pointer) {
				count = L.DomEvent._pointersCount;
			} else {
				count = e.touches.length;
			}

			if (count > 1) { return; }

			var now = Date.now(),
			    delta = now - (last || now);

			touch = e.touches ? e.touches[0] : e;
			doubleTap = (delta > 0 && delta <= delay);
			last = now;
		}

		function onTouchEnd() {
			if (doubleTap && !touch.cancelBubble) {
				if (L.Browser.pointer) {
					// work around .type being readonly with MSPointer* events
					var newTouch = {},
					    prop, i;

					for (i in touch) {
						prop = touch[i];
						newTouch[i] = prop && prop.bind ? prop.bind(touch) : prop;
					}
					touch = newTouch;
				}
				touch.type = 'dblclick';
				handler(touch);
				last = null;
			}
		}

		var pre = '_leaflet_',
		    touchstart = this._touchstart,
		    touchend = this._touchend;

		obj[pre + touchstart + id] = onTouchStart;
		obj[pre + touchend + id] = onTouchEnd;

		obj.addEventListener(touchstart, onTouchStart, false);
		obj.addEventListener(touchend, onTouchEnd, false);
		return this;
	},

	removeDoubleTapListener: function (obj, id) {
		var pre = '_leaflet_',
		    touchend = obj[pre + this._touchend + id];

		obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);
		obj.removeEventListener(this._touchend, touchend, false);

		return this;
	}
});



/*
 * Extends L.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
 */

L.extend(L.DomEvent, {

	POINTER_DOWN:   L.Browser.msPointer ? 'MSPointerDown'   : 'pointerdown',
	POINTER_MOVE:   L.Browser.msPointer ? 'MSPointerMove'   : 'pointermove',
	POINTER_UP:     L.Browser.msPointer ? 'MSPointerUp'     : 'pointerup',
	POINTER_CANCEL: L.Browser.msPointer ? 'MSPointerCancel' : 'pointercancel',

	_pointers: {},
	_pointersCount: 0,

	// Provides a touch events wrapper for (ms)pointer events.
	// ref http://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890

	addPointerListener: function (obj, type, handler, id) {

		if (type === 'touchstart') {
			this._addPointerStart(obj, handler, id);

		} else if (type === 'touchmove') {
			this._addPointerMove(obj, handler, id);

		} else if (type === 'touchend') {
			this._addPointerEnd(obj, handler, id);
		}

		return this;
	},

	removePointerListener: function (obj, type, id) {
		var handler = obj['_leaflet_' + type + id];

		if (type === 'touchstart') {
			obj.removeEventListener(this.POINTER_DOWN, handler, false);

		} else if (type === 'touchmove') {
			obj.removeEventListener(this.POINTER_MOVE, handler, false);

		} else if (type === 'touchend') {
			obj.removeEventListener(this.POINTER_UP, handler, false);
			obj.removeEventListener(this.POINTER_CANCEL, handler, false);
		}

		return this;
	},

	_addPointerStart: function (obj, handler, id) {
		var onDown = L.bind(function (e) {
			if (e.pointerType !== 'mouse' && e.pointerType !== e.MSPOINTER_TYPE_MOUSE) {
				L.DomEvent.preventDefault(e);
			}

			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchstart' + id] = onDown;
		obj.addEventListener(this.POINTER_DOWN, onDown, false);

		// need to keep track of what pointers and how many are active to provide e.touches emulation
		if (!this._pointerDocListener) {
			var pointerUp = L.bind(this._globalPointerUp, this);

			// we listen documentElement as any drags that end by moving the touch off the screen get fired there
			document.documentElement.addEventListener(this.POINTER_DOWN, L.bind(this._globalPointerDown, this), true);
			document.documentElement.addEventListener(this.POINTER_MOVE, L.bind(this._globalPointerMove, this), true);
			document.documentElement.addEventListener(this.POINTER_UP, pointerUp, true);
			document.documentElement.addEventListener(this.POINTER_CANCEL, pointerUp, true);

			this._pointerDocListener = true;
		}
	},

	_globalPointerDown: function (e) {
		this._pointers[e.pointerId] = e;
		this._pointersCount++;
	},

	_globalPointerMove: function (e) {
		if (this._pointers[e.pointerId]) {
			this._pointers[e.pointerId] = e;
		}
	},

	_globalPointerUp: function (e) {
		delete this._pointers[e.pointerId];
		this._pointersCount--;
	},

	_handlePointer: function (e, handler) {
		e.touches = [];
		for (var i in this._pointers) {
			e.touches.push(this._pointers[i]);
		}
		e.changedTouches = [e];

		handler(e);
	},

	_addPointerMove: function (obj, handler, id) {
		var onMove = L.bind(function (e) {
			// don't fire touch moves when mouse isn't down
			if ((e.pointerType === e.MSPOINTER_TYPE_MOUSE || e.pointerType === 'mouse') && e.buttons === 0) { return; }

			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchmove' + id] = onMove;
		obj.addEventListener(this.POINTER_MOVE, onMove, false);
	},

	_addPointerEnd: function (obj, handler, id) {
		var onUp = L.bind(function (e) {
			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchend' + id] = onUp;
		obj.addEventListener(this.POINTER_UP, onUp, false);
		obj.addEventListener(this.POINTER_CANCEL, onUp, false);
	}
});



/*
 * L.Handler.TouchZoom is used by L.Map to add pinch zoom on supported mobile browsers.
 */

L.Map.mergeOptions({
	touchZoom: L.Browser.touch && !L.Browser.android23,
	bounceAtZoomLimits: true
});

L.Map.TouchZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	_onTouchStart: function (e) {
		var map = this._map;

		if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) { return; }

		var p1 = map.mouseEventToContainerPoint(e.touches[0]),
		    p2 = map.mouseEventToContainerPoint(e.touches[1]);

		this._centerPoint = map.getSize()._divideBy(2);
		this._startLatLng = map.containerPointToLatLng(this._centerPoint);
		if (map.options.touchZoom !== 'center') {
			this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2)._divideBy(2));
		}

		this._startDist = p1.distanceTo(p2);
		this._startZoom = map.getZoom();

		this._moved = false;
		this._zooming = true;

		map.stop();

		L.DomEvent
		    .on(document, 'touchmove', this._onTouchMove, this)
		    .on(document, 'touchend', this._onTouchEnd, this);

		L.DomEvent.preventDefault(e);
	},

	_onTouchMove: function (e) {
		if (!e.touches || e.touches.length !== 2 || !this._zooming) { return; }

		var map = this._map,
		    p1 = map.mouseEventToContainerPoint(e.touches[0]),
		    p2 = map.mouseEventToContainerPoint(e.touches[1]),
		    scale = p1.distanceTo(p2) / this._startDist;


		this._zoom = map.getScaleZoom(scale, this._startZoom);

		if (map.options.touchZoom === 'center') {
			this._center = this._startLatLng;
			if (scale === 1) { return; }
		} else {
			// Get delta from pinch to center, so centerLatLng is delta applied to initial pinchLatLng
			var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
			if (scale === 1 && delta.x === 0 && delta.y === 0) { return; }
			this._center = map.unproject(map.project(this._pinchStartLatLng).subtract(delta));
		}

		if (!map.options.bounceAtZoomLimits) {
			if ((this._zoom <= map.getMinZoom() && scale < 1) ||
		        (this._zoom >= map.getMaxZoom() && scale > 1)) { return; }
		}

		if (!this._moved) {
			map._moveStart(true);
			this._moved = true;
		}

		L.Util.cancelAnimFrame(this._animRequest);

		var moveFn = L.bind(map._move, map, this._center, this._zoom, {pinch: true, round: false});
		this._animRequest = L.Util.requestAnimFrame(moveFn, this, true);

		L.DomEvent.preventDefault(e);
	},

	_onTouchEnd: function () {
		if (!this._moved || !this._zooming) {
			this._zooming = false;
			return;
		}

		this._zooming = false;
		L.Util.cancelAnimFrame(this._animRequest);

		L.DomEvent
		    .off(document, 'touchmove', this._onTouchMove)
		    .off(document, 'touchend', this._onTouchEnd);

		var zoom = this._zoom;
		zoom = this._map._limitZoom(zoom - this._startZoom > 0 ? Math.ceil(zoom) : Math.floor(zoom));


		this._map._animateZoom(this._center, zoom, true, true);
	}
});

L.Map.addInitHook('addHandler', 'touchZoom', L.Map.TouchZoom);



/*
 * L.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */

L.Map.mergeOptions({
	tap: true,
	tapTolerance: 15
});

L.Map.Tap = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onDown, this);
	},

	_onDown: function (e) {
		if (!e.touches) { return; }

		L.DomEvent.preventDefault(e);

		this._fireClick = true;

		// don't simulate click or track longpress if more than 1 touch
		if (e.touches.length > 1) {
			this._fireClick = false;
			clearTimeout(this._holdTimeout);
			return;
		}

		var first = e.touches[0],
		    el = first.target;

		this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);

		// if touching a link, highlight it
		if (el.tagName && el.tagName.toLowerCase() === 'a') {
			L.DomUtil.addClass(el, 'leaflet-active');
		}

		// simulate long hold but setting a timeout
		this._holdTimeout = setTimeout(L.bind(function () {
			if (this._isTapValid()) {
				this._fireClick = false;
				this._onUp();
				this._simulateEvent('contextmenu', first);
			}
		}, this), 1000);

		this._simulateEvent('mousedown', first);

		L.DomEvent.on(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);
	},

	_onUp: function (e) {
		clearTimeout(this._holdTimeout);

		L.DomEvent.off(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);

		if (this._fireClick && e && e.changedTouches) {

			var first = e.changedTouches[0],
			    el = first.target;

			if (el && el.tagName && el.tagName.toLowerCase() === 'a') {
				L.DomUtil.removeClass(el, 'leaflet-active');
			}

			this._simulateEvent('mouseup', first);

			// simulate click if the touch didn't move too much
			if (this._isTapValid()) {
				this._simulateEvent('click', first);
			}
		}
	},

	_isTapValid: function () {
		return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
	},

	_onMove: function (e) {
		var first = e.touches[0];
		this._newPos = new L.Point(first.clientX, first.clientY);
		this._simulateEvent('mousemove', first);
	},

	_simulateEvent: function (type, e) {
		var simulatedEvent = document.createEvent('MouseEvents');

		simulatedEvent._simulated = true;
		e.target._simulatedClick = true;

		simulatedEvent.initMouseEvent(
		        type, true, true, window, 1,
		        e.screenX, e.screenY,
		        e.clientX, e.clientY,
		        false, false, false, false, 0, null);

		e.target.dispatchEvent(simulatedEvent);
	}
});

if (L.Browser.touch && !L.Browser.pointer) {
	L.Map.addInitHook('addHandler', 'tap', L.Map.Tap);
}



/*
 * L.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
  * (zoom to a selected bounding box), enabled by default.
 */

L.Map.mergeOptions({
	boxZoom: true
});

L.Map.BoxZoom = L.Handler.extend({
	initialize: function (map) {
		this._map = map;
		this._container = map._container;
		this._pane = map._panes.overlayPane;
	},

	addHooks: function () {
		L.DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._container, 'mousedown', this._onMouseDown, this);
	},

	moved: function () {
		return this._moved;
	},

	_resetState: function () {
		this._moved = false;
	},

	_onMouseDown: function (e) {
		if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) { return false; }

		this._resetState();

		L.DomUtil.disableTextSelection();
		L.DomUtil.disableImageDrag();

		this._startPoint = this._map.mouseEventToContainerPoint(e);

		L.DomEvent.on(document, {
			contextmenu: L.DomEvent.stop,
			mousemove: this._onMouseMove,
			mouseup: this._onMouseUp,
			keydown: this._onKeyDown
		}, this);
	},

	_onMouseMove: function (e) {
		if (!this._moved) {
			this._moved = true;

			this._box = L.DomUtil.create('div', 'leaflet-zoom-box', this._container);
			L.DomUtil.addClass(this._container, 'leaflet-crosshair');

			this._map.fire('boxzoomstart');
		}

		this._point = this._map.mouseEventToContainerPoint(e);

		var bounds = new L.Bounds(this._point, this._startPoint),
		    size = bounds.getSize();

		L.DomUtil.setPosition(this._box, bounds.min);

		this._box.style.width  = size.x + 'px';
		this._box.style.height = size.y + 'px';
	},

	_finish: function () {
		if (this._moved) {
			L.DomUtil.remove(this._box);
			L.DomUtil.removeClass(this._container, 'leaflet-crosshair');
		}

		L.DomUtil.enableTextSelection();
		L.DomUtil.enableImageDrag();

		L.DomEvent.off(document, {
			contextmenu: L.DomEvent.stop,
			mousemove: this._onMouseMove,
			mouseup: this._onMouseUp,
			keydown: this._onKeyDown
		}, this);
	},

	_onMouseUp: function (e) {
		if ((e.which !== 1) && (e.button !== 1)) { return; }

		this._finish();

		if (!this._moved) { return; }
		// Postpone to next JS tick so internal click event handling
		// still see it as "moved".
		setTimeout(L.bind(this._resetState, this), 0);

		var bounds = new L.LatLngBounds(
		        this._map.containerPointToLatLng(this._startPoint),
		        this._map.containerPointToLatLng(this._point));

		this._map
			.fitBounds(bounds)
			.fire('boxzoomend', {boxZoomBounds: bounds});
	},

	_onKeyDown: function (e) {
		if (e.keyCode === 27) {
			this._finish();
		}
	}
});

L.Map.addInitHook('addHandler', 'boxZoom', L.Map.BoxZoom);



/*
 * L.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
 */

L.Map.mergeOptions({
	keyboard: true,
	keyboardPanOffset: 80,
	keyboardZoomOffset: 1
});

L.Map.Keyboard = L.Handler.extend({

	keyCodes: {
		left:    [37],
		right:   [39],
		down:    [40],
		up:      [38],
		zoomIn:  [187, 107, 61, 171],
		zoomOut: [189, 109, 54, 173]
	},

	initialize: function (map) {
		this._map = map;

		this._setPanOffset(map.options.keyboardPanOffset);
		this._setZoomOffset(map.options.keyboardZoomOffset);
	},

	addHooks: function () {
		var container = this._map._container;

		// make the container focusable by tabbing
		if (container.tabIndex <= 0) {
			container.tabIndex = '0';
		}

		L.DomEvent.on(container, {
			focus: this._onFocus,
			blur: this._onBlur,
			mousedown: this._onMouseDown
		}, this);

		this._map.on({
			focus: this._addHooks,
			blur: this._removeHooks
		}, this);
	},

	removeHooks: function () {
		this._removeHooks();

		L.DomEvent.off(this._map._container, {
			focus: this._onFocus,
			blur: this._onBlur,
			mousedown: this._onMouseDown
		}, this);

		this._map.off({
			focus: this._addHooks,
			blur: this._removeHooks
		}, this);
	},

	_onMouseDown: function () {
		if (this._focused) { return; }

		var body = document.body,
		    docEl = document.documentElement,
		    top = body.scrollTop || docEl.scrollTop,
		    left = body.scrollLeft || docEl.scrollLeft;

		this._map._container.focus();

		window.scrollTo(left, top);
	},

	_onFocus: function () {
		this._focused = true;
		this._map.fire('focus');
	},

	_onBlur: function () {
		this._focused = false;
		this._map.fire('blur');
	},

	_setPanOffset: function (pan) {
		var keys = this._panKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.left.length; i < len; i++) {
			keys[codes.left[i]] = [-1 * pan, 0];
		}
		for (i = 0, len = codes.right.length; i < len; i++) {
			keys[codes.right[i]] = [pan, 0];
		}
		for (i = 0, len = codes.down.length; i < len; i++) {
			keys[codes.down[i]] = [0, pan];
		}
		for (i = 0, len = codes.up.length; i < len; i++) {
			keys[codes.up[i]] = [0, -1 * pan];
		}
	},

	_setZoomOffset: function (zoom) {
		var keys = this._zoomKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.zoomIn.length; i < len; i++) {
			keys[codes.zoomIn[i]] = zoom;
		}
		for (i = 0, len = codes.zoomOut.length; i < len; i++) {
			keys[codes.zoomOut[i]] = -zoom;
		}
	},

	_addHooks: function () {
		L.DomEvent.on(document, 'keydown', this._onKeyDown, this);
	},

	_removeHooks: function () {
		L.DomEvent.off(document, 'keydown', this._onKeyDown, this);
	},

	_onKeyDown: function (e) {
		if (e.altKey || e.ctrlKey || e.metaKey) { return; }

		var key = e.keyCode,
		    map = this._map,
		    offset;

		if (key in this._panKeys) {

			if (map._panAnim && map._panAnim._inProgress) { return; }

			offset = this._panKeys[key];
			if (e.shiftKey) {
				offset = L.point(offset).multiplyBy(3);
			}

			map.panBy(offset);

			if (map.options.maxBounds) {
				map.panInsideBounds(map.options.maxBounds);
			}

		} else if (key in this._zoomKeys) {
			map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);

		} else if (key === 27) {
			map.closePopup();

		} else {
			return;
		}

		L.DomEvent.stop(e);
	}
});

L.Map.addInitHook('addHandler', 'keyboard', L.Map.Keyboard);



/*
 * L.Handler.MarkerDrag is used internally by L.Marker to make the markers draggable.
 */

L.Handler.MarkerDrag = L.Handler.extend({
	initialize: function (marker) {
		this._marker = marker;
	},

	addHooks: function () {
		var icon = this._marker._icon;

		if (!this._draggable) {
			this._draggable = new L.Draggable(icon, icon, true);
		}

		this._draggable.on({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).enable();

		L.DomUtil.addClass(icon, 'leaflet-marker-draggable');
	},

	removeHooks: function () {
		this._draggable.off({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).disable();

		if (this._marker._icon) {
			L.DomUtil.removeClass(this._marker._icon, 'leaflet-marker-draggable');
		}
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		this._marker
		    .closePopup()
		    .fire('movestart')
		    .fire('dragstart');
	},

	_onDrag: function (e) {
		var marker = this._marker,
		    shadow = marker._shadow,
		    iconPos = L.DomUtil.getPosition(marker._icon),
		    latlng = marker._map.layerPointToLatLng(iconPos);

		// update shadow position
		if (shadow) {
			L.DomUtil.setPosition(shadow, iconPos);
		}

		marker._latlng = latlng;
		e.latlng = latlng;

		marker
		    .fire('move', e)
		    .fire('drag', e);
	},

	_onDragEnd: function (e) {
		this._marker
		    .fire('moveend')
		    .fire('dragend', e);
	}
});



/*
 * L.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

L.Control = L.Class.extend({
	options: {
		position: 'topright'
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	getPosition: function () {
		return this.options.position;
	},

	setPosition: function (position) {
		var map = this._map;

		if (map) {
			map.removeControl(this);
		}

		this.options.position = position;

		if (map) {
			map.addControl(this);
		}

		return this;
	},

	getContainer: function () {
		return this._container;
	},

	addTo: function (map) {
		this.remove();
		this._map = map;

		var container = this._container = this.onAdd(map),
		    pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		L.DomUtil.addClass(container, 'leaflet-control');

		if (pos.indexOf('bottom') !== -1) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		return this;
	},

	remove: function () {
		if (!this._map) {
			return this;
		}

		L.DomUtil.remove(this._container);

		if (this.onRemove) {
			this.onRemove(this._map);
		}

		this._map = null;

		return this;
	},

	_refocusOnMap: function (e) {
		// if map exists and event is not a keyboard event
		if (this._map && e && e.screenX > 0 && e.screenY > 0) {
			this._map.getContainer().focus();
		}
	}
});

L.control = function (options) {
	return new L.Control(options);
};


// adds control-related methods to L.Map

L.Map.include({
	addControl: function (control) {
		control.addTo(this);
		return this;
	},

	removeControl: function (control) {
		control.remove();
		return this;
	},

	_initControlPos: function () {
		var corners = this._controlCorners = {},
		    l = 'leaflet-',
		    container = this._controlContainer =
		            L.DomUtil.create('div', l + 'control-container', this._container);

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide;

			corners[vSide + hSide] = L.DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos: function () {
		L.DomUtil.remove(this._controlContainer);
	}
});



/*
 * L.Control.Zoom is used for the default zoom buttons on the map.
 */

L.Control.Zoom = L.Control.extend({
	options: {
		position: 'topleft',
		zoomInText: '+',
		zoomInTitle: 'Zoom in',
		zoomOutText: '-',
		zoomOutTitle: 'Zoom out'
	},

	onAdd: function (map) {
		var zoomName = 'leaflet-control-zoom',
		    container = L.DomUtil.create('div', zoomName + ' leaflet-bar'),
		    options = this.options;

		this._zoomInButton  = this._createButton(options.zoomInText, options.zoomInTitle,
		        zoomName + '-in',  container, this._zoomIn);
		this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
		        zoomName + '-out', container, this._zoomOut);

		this._updateDisabled();
		map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		return container;
	},

	onRemove: function (map) {
		map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	},

	disable: function () {
		this._disabled = true;
		this._updateDisabled();
		return this;
	},

	enable: function () {
		this._disabled = false;
		this._updateDisabled();
		return this;
	},

	_zoomIn: function (e) {
		if (!this._disabled) {
			this._map.zoomIn(e.shiftKey ? 3 : 1);
		}
	},

	_zoomOut: function (e) {
		if (!this._disabled) {
			this._map.zoomOut(e.shiftKey ? 3 : 1);
		}
	},

	_createButton: function (html, title, className, container, fn) {
		var link = L.DomUtil.create('a', className, container);
		link.innerHTML = html;
		link.href = '#';
		link.title = title;

		L.DomEvent
		    .on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
		    .on(link, 'click', L.DomEvent.stop)
		    .on(link, 'click', fn, this)
		    .on(link, 'click', this._refocusOnMap, this);

		return link;
	},

	_updateDisabled: function () {
		var map = this._map,
		    className = 'leaflet-disabled';

		L.DomUtil.removeClass(this._zoomInButton, className);
		L.DomUtil.removeClass(this._zoomOutButton, className);

		if (this._disabled || map._zoom === map.getMinZoom()) {
			L.DomUtil.addClass(this._zoomOutButton, className);
		}
		if (this._disabled || map._zoom === map.getMaxZoom()) {
			L.DomUtil.addClass(this._zoomInButton, className);
		}
	}
});

L.Map.mergeOptions({
	zoomControl: true
});

L.Map.addInitHook(function () {
	if (this.options.zoomControl) {
		this.zoomControl = new L.Control.Zoom();
		this.addControl(this.zoomControl);
	}
});

L.control.zoom = function (options) {
	return new L.Control.Zoom(options);
};



/*
 * L.Control.Attribution is used for displaying attribution on the map (added by default).
 */

L.Control.Attribution = L.Control.extend({
	options: {
		position: 'bottomright',
		prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
	},

	initialize: function (options) {
		L.setOptions(this, options);

		this._attributions = {};
	},

	onAdd: function (map) {
		this._container = L.DomUtil.create('div', 'leaflet-control-attribution');
		if (L.DomEvent) {
			L.DomEvent.disableClickPropagation(this._container);
		}

		// TODO ugly, refactor
		for (var i in map._layers) {
			if (map._layers[i].getAttribution) {
				this.addAttribution(map._layers[i].getAttribution());
			}
		}

		this._update();

		return this._container;
	},

	setPrefix: function (prefix) {
		this.options.prefix = prefix;
		this._update();
		return this;
	},

	addAttribution: function (text) {
		if (!text) { return this; }

		if (!this._attributions[text]) {
			this._attributions[text] = 0;
		}
		this._attributions[text]++;

		this._update();

		return this;
	},

	removeAttribution: function (text) {
		if (!text) { return this; }

		if (this._attributions[text]) {
			this._attributions[text]--;
			this._update();
		}

		return this;
	},

	_update: function () {
		if (!this._map) { return; }

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	}
});

L.Map.mergeOptions({
	attributionControl: true
});

L.Map.addInitHook(function () {
	if (this.options.attributionControl) {
		this.attributionControl = (new L.Control.Attribution()).addTo(this);
	}
});

L.control.attribution = function (options) {
	return new L.Control.Attribution(options);
};



/*
 * L.Control.Scale is used for displaying metric/imperial scale on the map.
 */

L.Control.Scale = L.Control.extend({
	options: {
		position: 'bottomleft',
		maxWidth: 100,
		metric: true,
		imperial: true
		// updateWhenIdle: false
	},

	onAdd: function (map) {
		var className = 'leaflet-control-scale',
		    container = L.DomUtil.create('div', className),
		    options = this.options;

		this._addScales(options, className + '-line', container);

		map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
		map.whenReady(this._update, this);

		return container;
	},

	onRemove: function (map) {
		map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	},

	_addScales: function (options, className, container) {
		if (options.metric) {
			this._mScale = L.DomUtil.create('div', className, container);
		}
		if (options.imperial) {
			this._iScale = L.DomUtil.create('div', className, container);
		}
	},

	_update: function () {
		var map = this._map,
		    y = map.getSize().y / 2;

		var maxMeters = map.distance(
				map.containerPointToLatLng([0, y]),
				map.containerPointToLatLng([this.options.maxWidth, y]));

		this._updateScales(maxMeters);
	},

	_updateScales: function (maxMeters) {
		if (this.options.metric && maxMeters) {
			this._updateMetric(maxMeters);
		}
		if (this.options.imperial && maxMeters) {
			this._updateImperial(maxMeters);
		}
	},

	_updateMetric: function (maxMeters) {
		var meters = this._getRoundNum(maxMeters),
		    label = meters < 1000 ? meters + ' m' : (meters / 1000) + ' km';

		this._updateScale(this._mScale, label, meters / maxMeters);
	},

	_updateImperial: function (maxMeters) {
		var maxFeet = maxMeters * 3.2808399,
		    maxMiles, miles, feet;

		if (maxFeet > 5280) {
			maxMiles = maxFeet / 5280;
			miles = this._getRoundNum(maxMiles);
			this._updateScale(this._iScale, miles + ' mi', miles / maxMiles);

		} else {
			feet = this._getRoundNum(maxFeet);
			this._updateScale(this._iScale, feet + ' ft', feet / maxFeet);
		}
	},

	_updateScale: function (scale, text, ratio) {
		scale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
		scale.innerHTML = text;
	},

	_getRoundNum: function (num) {
		var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
		    d = num / pow10;

		d = d >= 10 ? 10 :
		    d >= 5 ? 5 :
		    d >= 3 ? 3 :
		    d >= 2 ? 2 : 1;

		return pow10 * d;
	}
});

L.control.scale = function (options) {
	return new L.Control.Scale(options);
};



/*
 * L.Control.Layers is a control to allow users to switch between different layers on the map.
 */

L.Control.Layers = L.Control.extend({
	options: {
		collapsed: true,
		position: 'topright',
		autoZIndex: true,
		hideSingleBase: false
	},

	initialize: function (baseLayers, overlays, options) {
		L.setOptions(this, options);

		this._layers = {};
		this._lastZIndex = 0;
		this._handlingClick = false;

		for (var i in baseLayers) {
			this._addLayer(baseLayers[i], i);
		}

		for (i in overlays) {
			this._addLayer(overlays[i], i, true);
		}
	},

	onAdd: function (map) {
		this._initLayout();
		this._update();

		this._map = map;
		map.on('zoomend', this._checkDisabledLayers, this);

		return this._container;
	},

	onRemove: function () {
		this._map.off('zoomend', this._checkDisabledLayers, this);
	},

	addBaseLayer: function (layer, name) {
		this._addLayer(layer, name);
		return this._update();
	},

	addOverlay: function (layer, name) {
		this._addLayer(layer, name, true);
		return this._update();
	},

	removeLayer: function (layer) {
		layer.off('add remove', this._onLayerChange, this);

		delete this._layers[L.stamp(layer)];
		return this._update();
	},

	_initLayout: function () {
		var className = 'leaflet-control-layers',
		    container = this._container = L.DomUtil.create('div', className);

		// makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		L.DomEvent.disableClickPropagation(container);
		if (!L.Browser.touch) {
			L.DomEvent.disableScrollPropagation(container);
		}

		var form = this._form = L.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {
			if (!L.Browser.android) {
				L.DomEvent.on(container, {
					mouseenter: this._expand,
					mouseleave: this._collapse
				}, this);
			}

			var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Layers';

			if (L.Browser.touch) {
				L.DomEvent
				    .on(link, 'click', L.DomEvent.stop)
				    .on(link, 'click', this._expand, this);
			} else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}

			// work around for Firefox Android issue https://github.com/Leaflet/Leaflet/issues/2033
			L.DomEvent.on(form, 'click', function () {
				setTimeout(L.bind(this._onInputClick, this), 0);
			}, this);

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
		this._separator = L.DomUtil.create('div', className + '-separator', form);
		this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

		container.appendChild(form);
	},

	_addLayer: function (layer, name, overlay) {
		layer.on('add remove', this._onLayerChange, this);

		var id = L.stamp(layer);

		this._layers[id] = {
			layer: layer,
			name: name,
			overlay: overlay
		};

		if (this.options.autoZIndex && layer.setZIndex) {
			this._lastZIndex++;
			layer.setZIndex(this._lastZIndex);
		}
	},

	_update: function () {
		if (!this._container) { return this; }

		L.DomUtil.empty(this._baseLayersList);
		L.DomUtil.empty(this._overlaysList);

		var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;

		for (i in this._layers) {
			obj = this._layers[i];
			this._addItem(obj);
			overlaysPresent = overlaysPresent || obj.overlay;
			baseLayersPresent = baseLayersPresent || !obj.overlay;
			baseLayersCount += !obj.overlay ? 1 : 0;
		}

		// Hide base layers section if there's only one layer.
		if (this.options.hideSingleBase) {
			baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
			this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
		}

		this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';

		return this;
	},

	_onLayerChange: function (e) {
		if (!this._handlingClick) {
			this._update();
		}

		var obj = this._layers[L.stamp(e.target)];

		var type = obj.overlay ?
			(e.type === 'add' ? 'overlayadd' : 'overlayremove') :
			(e.type === 'add' ? 'baselayerchange' : null);

		if (type) {
			this._map.fire(type, obj);
		}
	},

	// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
	_createRadioElement: function (name, checked) {

		var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' +
				name + '"' + (checked ? ' checked="checked"' : '') + '/>';

		var radioFragment = document.createElement('div');
		radioFragment.innerHTML = radioHtml;

		return radioFragment.firstChild;
	},

	_addItem: function (obj) {
		var label = document.createElement('label'),
		    checked = this._map.hasLayer(obj.layer),
		    input;

		if (obj.overlay) {
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = checked;
		} else {
			input = this._createRadioElement('leaflet-base-layers', checked);
		}

		input.layerId = L.stamp(obj.layer);

		L.DomEvent.on(input, 'click', this._onInputClick, this);

		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;

		// Helps from preventing layer control flicker when checkboxes are disabled
		// https://github.com/Leaflet/Leaflet/issues/2771
		var holder = document.createElement('div');

		label.appendChild(holder);
		holder.appendChild(input);
		holder.appendChild(name);

		var container = obj.overlay ? this._overlaysList : this._baseLayersList;
		container.appendChild(label);

		this._checkDisabledLayers();
		return label;
	},

	_onInputClick: function () {
		var inputs = this._form.getElementsByTagName('input'),
		    input, layer, hasLayer;
		var addedLayers = [],
		    removedLayers = [];

		this._handlingClick = true;

		for (var i = inputs.length - 1; i >= 0; i--) {
			input = inputs[i];
			layer = this._layers[input.layerId].layer;
			hasLayer = this._map.hasLayer(layer);

			if (input.checked && !hasLayer) {
				addedLayers.push(layer);

			} else if (!input.checked && hasLayer) {
				removedLayers.push(layer);
			}
		}

		// Bugfix issue 2318: Should remove all old layers before readding new ones
		for (i = 0; i < removedLayers.length; i++) {
			this._map.removeLayer(removedLayers[i]);
		}
		for (i = 0; i < addedLayers.length; i++) {
			this._map.addLayer(addedLayers[i]);
		}

		this._handlingClick = false;

		this._refocusOnMap();
	},

	_expand: function () {
		L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
		this._form.style.height = null;
		var acceptableHeight = this._map._size.y - (this._container.offsetTop + 50);
		if (acceptableHeight < this._form.clientHeight) {
			L.DomUtil.addClass(this._form, 'leaflet-control-layers-scrollbar');
			this._form.style.height = acceptableHeight + 'px';
		} else {
			L.DomUtil.removeClass(this._form, 'leaflet-control-layers-scrollbar');
		}
		this._checkDisabledLayers();
	},

	_collapse: function () {
		L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
	},

	_checkDisabledLayers: function () {
		var inputs = this._form.getElementsByTagName('input'),
		    input,
		    layer,
		    zoom = this._map.getZoom();

		for (var i = inputs.length - 1; i >= 0; i--) {
			input = inputs[i];
			layer = this._layers[input.layerId].layer;
			input.disabled = (layer.options.minZoom !== undefined && zoom < layer.options.minZoom) ||
			                 (layer.options.maxZoom !== undefined && zoom > layer.options.maxZoom);

		}
	}
});

L.control.layers = function (baseLayers, overlays, options) {
	return new L.Control.Layers(baseLayers, overlays, options);
};



/*
 * L.PosAnimation powers Leaflet pan animations internally.
 */

L.PosAnimation = L.Evented.extend({

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._duration = duration || 0.25;
		this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

		this._startPos = L.DomUtil.getPosition(el);
		this._offset = newPos.subtract(this._startPos);
		this._startTime = +new Date();

		this.fire('start');

		this._animate();
	},

	stop: function () {
		if (!this._inProgress) { return; }

		this._step(true);
		this._complete();
	},

	_animate: function () {
		// animation loop
		this._animId = L.Util.requestAnimFrame(this._animate, this);
		this._step();
	},

	_step: function (round) {
		var elapsed = (+new Date()) - this._startTime,
		    duration = this._duration * 1000;

		if (elapsed < duration) {
			this._runFrame(this._easeOut(elapsed / duration), round);
		} else {
			this._runFrame(1);
			this._complete();
		}
	},

	_runFrame: function (progress, round) {
		var pos = this._startPos.add(this._offset.multiplyBy(progress));
		if (round) {
			pos._round();
		}
		L.DomUtil.setPosition(this._el, pos);

		this.fire('step');
	},

	_complete: function () {
		L.Util.cancelAnimFrame(this._animId);

		this._inProgress = false;
		this.fire('end');
	},

	_easeOut: function (t) {
		return 1 - Math.pow(1 - t, this._easeOutPower);
	}
});



/*
 * Extends L.Map to handle panning animations.
 */

L.Map.include({

	setView: function (center, zoom, options) {

		zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
		center = this._limitCenter(L.latLng(center), zoom, this.options.maxBounds);
		options = options || {};

		this.stop();

		if (this._loaded && !options.reset && options !== true) {

			if (options.animate !== undefined) {
				options.zoom = L.extend({animate: options.animate}, options.zoom);
				options.pan = L.extend({animate: options.animate, duration: options.duration}, options.pan);
			}

			// try animating pan or zoom
			var moved = (this._zoom !== zoom) ?
				this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) :
				this._tryAnimatedPan(center, options.pan);

			if (moved) {
				// prevent resize handler call, the view will refresh after animation anyway
				clearTimeout(this._sizeTimer);
				return this;
			}
		}

		// animation didn't start, just reset the map view
		this._resetView(center, zoom);

		return this;
	},

	panBy: function (offset, options) {
		offset = L.point(offset).round();
		options = options || {};

		if (!offset.x && !offset.y) {
			return this.fire('moveend');
		}
		// If we pan too far, Chrome gets issues with tiles
		// and makes them disappear or appear in the wrong place (slightly offset) #2602
		if (options.animate !== true && !this.getSize().contains(offset)) {
			this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
			return this;
		}

		if (!this._panAnim) {
			this._panAnim = new L.PosAnimation();

			this._panAnim.on({
				'step': this._onPanTransitionStep,
				'end': this._onPanTransitionEnd
			}, this);
		}

		// don't fire movestart if animating inertia
		if (!options.noMoveStart) {
			this.fire('movestart');
		}

		// animate pan unless animate: false specified
		if (options.animate !== false) {
			L.DomUtil.addClass(this._mapPane, 'leaflet-pan-anim');

			var newPos = this._getMapPanePos().subtract(offset);
			this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
		} else {
			this._rawPanBy(offset);
			this.fire('move').fire('moveend');
		}

		return this;
	},

	_onPanTransitionStep: function () {
		this.fire('move');
	},

	_onPanTransitionEnd: function () {
		L.DomUtil.removeClass(this._mapPane, 'leaflet-pan-anim');
		this.fire('moveend');
	},

	_tryAnimatedPan: function (center, options) {
		// difference between the new and current centers in pixels
		var offset = this._getCenterOffset(center)._floor();

		// don't animate too far unless animate: true specified in options
		if ((options && options.animate) !== true && !this.getSize().contains(offset)) { return false; }

		this.panBy(offset, options);

		return true;
	}
});



/*
 * Extends L.Map to handle zoom animations.
 */

L.Map.mergeOptions({
	zoomAnimation: true,
	zoomAnimationThreshold: 4
});

var zoomAnimated = L.DomUtil.TRANSITION && L.Browser.any3d && !L.Browser.mobileOpera;

if (zoomAnimated) {

	L.Map.addInitHook(function () {
		// don't animate on browsers without hardware-accelerated transitions or old Android/Opera
		this._zoomAnimated = this.options.zoomAnimation;

		// zoom transitions run with the same duration for all layers, so if one of transitionend events
		// happens after starting zoom animation (propagating to the map pane), we know that it ended globally
		if (this._zoomAnimated) {

			this._createAnimProxy();

			L.DomEvent.on(this._proxy, L.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
		}
	});
}

L.Map.include(!zoomAnimated ? {} : {

	_createAnimProxy: function () {

		var proxy = this._proxy = L.DomUtil.create('div', 'leaflet-proxy leaflet-zoom-animated');
		this._panes.mapPane.appendChild(proxy);

		this.on('zoomanim', function (e) {
			var prop = L.DomUtil.TRANSFORM,
			    transform = proxy.style[prop];

			L.DomUtil.setTransform(proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1));

			// workaround for case when transform is the same and so transitionend event is not fired
			if (transform === proxy.style[prop] && this._animatingZoom) {
				this._onZoomTransitionEnd();
			}
		}, this);

		this.on('load moveend', function () {
			var c = this.getCenter(),
			    z = this.getZoom();
			L.DomUtil.setTransform(proxy, this.project(c, z), this.getZoomScale(z, 1));
		}, this);
	},

	_catchTransitionEnd: function (e) {
		if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
			this._onZoomTransitionEnd();
		}
	},

	_nothingToAnimate: function () {
		return !this._container.getElementsByClassName('leaflet-zoom-animated').length;
	},

	_tryAnimatedZoom: function (center, zoom, options) {

		if (this._animatingZoom) { return true; }

		options = options || {};

		// don't animate if disabled, not supported or zoom difference is too large
		if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() ||
		        Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) { return false; }

		// offset is the pixel coords of the zoom origin relative to the current center
		var scale = this.getZoomScale(zoom),
		    offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale);

		// don't animate if the zoom origin isn't within one screen from the current center, unless forced
		if (options.animate !== true && !this.getSize().contains(offset)) { return false; }

		L.Util.requestAnimFrame(function () {
			this
			    ._moveStart(true)
			    ._animateZoom(center, zoom, true);
		}, this);

		return true;
	},

	_animateZoom: function (center, zoom, startAnim, noUpdate) {
		if (startAnim) {
			this._animatingZoom = true;

			// remember what center/zoom to set after animation
			this._animateToCenter = center;
			this._animateToZoom = zoom;

			L.DomUtil.addClass(this._mapPane, 'leaflet-zoom-anim');
		}

		this.fire('zoomanim', {
			center: center,
			zoom: zoom,
			noUpdate: noUpdate
		});

		// Work around webkit not firing 'transitionend', see https://github.com/Leaflet/Leaflet/issues/3689, 2693
		setTimeout(L.bind(this._onZoomTransitionEnd, this), 250);
	},

	_onZoomTransitionEnd: function () {
		if (!this._animatingZoom) { return; }

		L.DomUtil.removeClass(this._mapPane, 'leaflet-zoom-anim');

		// This anim frame should prevent an obscure iOS webkit tile loading race condition.
		L.Util.requestAnimFrame(function () {
			this._animatingZoom = false;

			this
				._move(this._animateToCenter, this._animateToZoom)
				._moveEnd(true);
		}, this);
	}
});




L.Map.include({
	flyTo: function (targetCenter, targetZoom, options) {

		options = options || {};
		if (options.animate === false || !L.Browser.any3d) {
			return this.setView(targetCenter, targetZoom, options);
		}

		this.stop();

		var from = this.project(this.getCenter()),
		    to = this.project(targetCenter),
		    size = this.getSize(),
		    startZoom = this._zoom;

		targetCenter = L.latLng(targetCenter);
		targetZoom = targetZoom === undefined ? startZoom : targetZoom;

		var w0 = Math.max(size.x, size.y),
		    w1 = w0 * this.getZoomScale(startZoom, targetZoom),
		    u1 = (to.distanceTo(from)) || 1,
		    rho = 1.42,
		    rho2 = rho * rho;

		function r(i) {
			var b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
			return Math.log(Math.sqrt(b * b + 1) - b);
		}

		function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }
		function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }
		function tanh(n) { return sinh(n) / cosh(n); }

		var r0 = r(0);

		function w(s) { return w0 * (cosh(r0) / cosh(r0 + rho * s)); }
		function u(s) { return w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2; }

		function easeOut(t) { return 1 - Math.pow(1 - t, 1.5); }

		var start = Date.now(),
		    S = (r(1) - r0) / rho,
		    duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;

		function frame() {
			var t = (Date.now() - start) / duration,
			    s = easeOut(t) * S;

			if (t <= 1) {
				this._flyToFrame = L.Util.requestAnimFrame(frame, this);

				this._move(
					this.unproject(from.add(to.subtract(from).multiplyBy(u(s) / u1)), startZoom),
					this.getScaleZoom(w0 / w(s), startZoom),
					{flyTo: true});

			} else {
				this
					._move(targetCenter, targetZoom)
					._moveEnd(true);
			}
		}

		this._moveStart(true);

		frame.call(this);
		return this;
	},

	flyToBounds: function (bounds, options) {
		var target = this._getBoundsCenterZoom(bounds, options);
		return this.flyTo(target.center, target.zoom, options);
	}
});



/*
 * Provides L.Map with convenient shortcuts for using browser geolocation features.
 */

L.Map.include({
	_defaultLocateOptions: {
		timeout: 10000,
		watch: false
		// setView: false
		// maxZoom: <Number>
		// maximumAge: 0
		// enableHighAccuracy: false
	},

	locate: function (options) {

		options = this._locateOptions = L.extend({}, this._defaultLocateOptions, options);

		if (!('geolocation' in navigator)) {
			this._handleGeolocationError({
				code: 0,
				message: 'Geolocation not supported.'
			});
			return this;
		}

		var onResponse = L.bind(this._handleGeolocationResponse, this),
		    onError = L.bind(this._handleGeolocationError, this);

		if (options.watch) {
			this._locationWatchId =
			        navigator.geolocation.watchPosition(onResponse, onError, options);
		} else {
			navigator.geolocation.getCurrentPosition(onResponse, onError, options);
		}
		return this;
	},

	stopLocate: function () {
		if (navigator.geolocation && navigator.geolocation.clearWatch) {
			navigator.geolocation.clearWatch(this._locationWatchId);
		}
		if (this._locateOptions) {
			this._locateOptions.setView = false;
		}
		return this;
	},

	_handleGeolocationError: function (error) {
		var c = error.code,
		    message = error.message ||
		            (c === 1 ? 'permission denied' :
		            (c === 2 ? 'position unavailable' : 'timeout'));

		if (this._locateOptions.setView && !this._loaded) {
			this.fitWorld();
		}

		this.fire('locationerror', {
			code: c,
			message: 'Geolocation error: ' + message + '.'
		});
	},

	_handleGeolocationResponse: function (pos) {
		var lat = pos.coords.latitude,
		    lng = pos.coords.longitude,
		    latlng = new L.LatLng(lat, lng),
		    bounds = latlng.toBounds(pos.coords.accuracy),
		    options = this._locateOptions;

		if (options.setView) {
			var zoom = this.getBoundsZoom(bounds);
			this.setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
		}

		var data = {
			latlng: latlng,
			bounds: bounds,
			timestamp: pos.timestamp
		};

		for (var i in pos.coords) {
			if (typeof pos.coords[i] === 'number') {
				data[i] = pos.coords[i];
			}
		}

		this.fire('locationfound', data);
	}
});


}(window, document));

},{}],5:[function(require,module,exports){
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
    L.DomUtil.addClass(this._container, this.options.showClass);
    return this;
  },


  /**
   * @param  {L.Map} map
   * @return {L.Tooltip}
   */
  onRemove: function(map) {
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
    L.Util.requestAnimFrame(function() {
      if (!point) {
        point = this._map.latLngToLayerPoint(this._latlng);
      }
      L.DomUtil.setPosition(this._container, point.add(
        this._getOffset(point, this.options.position)));
    }, this);
  }

});

L.tooltip = function(options, source) {
  return new L.Tooltip(options, source);
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL2pzL2FwcC5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xlYWZsZXQtZWRpdGFibGUvc3JjL0xlYWZsZXQuRWRpdGFibGUuanMiLCJub2RlX21vZHVsZXMvbGVhZmxldC9kaXN0L2xlYWZsZXQtc3JjLmpzIiwic3JjL1Rvb2x0aXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3N0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDejVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEwgPSByZXF1aXJlKCdsZWFmbGV0Jyk7XG52YXIgZWRpdGFibGUgPSByZXF1aXJlKCdsZWFmbGV0LWVkaXRhYmxlJyk7XG52YXIgVG9vbHRpcCA9IHJlcXVpcmUoJy4uLy4uLycpO1xudmFyIE1BUEJPWF9UT0tFTiA9ICdway5leUoxSWpvaWR6aHlJaXdpWVNJNklsRjJObGg2UVZraWZRLkQ3QmttZW9NSTdHRWtNRHRnM2R1cncnO1xuXG5MLkljb24uRGVmYXVsdC5pbWFnZVBhdGggPSAnaHR0cDovL2Nkbi5sZWFmbGV0anMuY29tL2xlYWZsZXQtMS4wLjAtYjEvaW1hZ2VzJ1xuXG52YXIgbWFwID0gZ2xvYmFsLm1hcCA9IEwubWFwKCdtYXAnLCB7XG4gIGVkaXRhYmxlOiB0cnVlXG59KS5zZXRWaWV3KFszMS4yMzUyLCAxMjEuNDk0Ml0sIDE1KTtcbm1hcC5hZGRMYXllcihuZXcgTC5UaWxlTGF5ZXIoXG4gICdodHRwczovL2EudGlsZXMubWFwYm94LmNvbS92NC9tYXBib3guc3RyZWV0cy1iYXNpYy97en0ve3h9L3t5fS5wbmc/YWNjZXNzX3Rva2VuPScgKyBNQVBCT1hfVE9LRU4pXG4pO1xuXG5MLkVkaXRDb250cm9sID0gTC5Db250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBudWxsLFxuICAgIGtpbmQ6ICcnLFxuICAgIGh0bWw6ICcnXG4gIH0sXG5cbiAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICB2YXIgY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtY29udHJvbCBsZWFmbGV0LWJhcicpLFxuICAgICAgICBsaW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICcnLCBjb250YWluZXIpO1xuXG4gICAgbGluay5ocmVmID0gJyMnO1xuICAgIGxpbmsudGl0bGUgPSAnQ3JlYXRlIGEgbmV3ICcgKyB0aGlzLm9wdGlvbnMua2luZDtcbiAgICBsaW5rLmlubmVySFRNTCA9IHRoaXMub3B0aW9ucy5odG1sO1xuICAgIEwuRG9tRXZlbnRcbiAgICAgIC5vbihsaW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3ApXG4gICAgICAub24obGluaywgJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cuTEFZRVIgPSB0aGlzLm9wdGlvbnMuY2FsbGJhY2sobnVsbCwge30pO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfVxufSk7XG5cbkwuTmV3TGluZUNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0UG9seWxpbmUsIG1hcC5lZGl0VG9vbHMpLFxuICAgIGtpbmQ6ICdsaW5lJyxcbiAgICBodG1sOiAnXFxcXC9cXFxcJ1xuICB9XG59KTtcblxuTC5OZXdQb2x5Z29uQ29udHJvbCA9IEwuRWRpdENvbnRyb2wuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIHBvc2l0aW9uOiAndG9wbGVmdCcsXG4gICAgY2FsbGJhY2s6IEwuVXRpbC5iaW5kKG1hcC5lZGl0VG9vbHMuc3RhcnRQb2x5Z29uLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAncG9seWdvbicsXG4gICAgaHRtbDogJ+KWsCdcbiAgfVxufSk7XG5cbkwuTmV3TWFya2VyQ29udHJvbCA9IEwuRWRpdENvbnRyb2wuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIHBvc2l0aW9uOiAndG9wbGVmdCcsXG4gICAgY2FsbGJhY2s6IEwuVXRpbC5iaW5kKG1hcC5lZGl0VG9vbHMuc3RhcnRNYXJrZXIsIG1hcC5lZGl0VG9vbHMpLFxuICAgIGtpbmQ6ICdtYXJrZXInLFxuICAgIGh0bWw6ICfwn5aIJ1xuICB9XG59KTtcblxuTC5OZXdSZWN0YW5nbGVDb250cm9sID0gTC5FZGl0Q29udHJvbC5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgcG9zaXRpb246ICd0b3BsZWZ0JyxcbiAgICBjYWxsYmFjazogTC5VdGlsLmJpbmQobWFwLmVkaXRUb29scy5zdGFydFJlY3RhbmdsZSwgbWFwLmVkaXRUb29scyksXG4gICAga2luZDogJ3JlY3RhbmdsZScsXG4gICAgZHJhZ2dhYmxlOiB0cnVlLFxuICAgIGh0bWw6ICfirJsnXG4gIH1cbn0pO1xuXG5MLk5ld0NpcmNsZUNvbnRyb2wgPSBMLkVkaXRDb250cm9sLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICBwb3NpdGlvbjogJ3RvcGxlZnQnLFxuICAgIGNhbGxiYWNrOiBMLlV0aWwuYmluZChtYXAuZWRpdFRvb2xzLnN0YXJ0Q2lyY2xlLCBtYXAuZWRpdFRvb2xzKSxcbiAgICBraW5kOiAnY2lyY2xlJyxcbiAgICBodG1sOiAn4qykJ1xuICB9XG59KTtcblxuW1xuICBuZXcgTC5OZXdNYXJrZXJDb250cm9sKCksXG4gIG5ldyBMLk5ld0xpbmVDb250cm9sKCksIG5ldyBMLk5ld1BvbHlnb25Db250cm9sKCksXG4gIG5ldyBMLk5ld1JlY3RhbmdsZUNvbnRyb2woKSwgbmV3IEwuTmV3Q2lyY2xlQ29udHJvbCgpXG5dLmZvckVhY2gobWFwLmFkZENvbnRyb2wsIG1hcCk7XG5cblxudmFyIGJvdW5kcyA9IG1hcC5nZXRCb3VuZHMoKS5wYWQoMC4yNSk7IC8vIHNsaWdodGx5IG91dCBvZiBzY3JlZW5cbnZhciB0b29sdGlwID0gTC50b29sdGlwKHtcbiAgcG9zaXRpb246ICdsZWZ0JyxcbiAgbm9XcmFwOiB0cnVlXG59KVxuICAuYWRkVG8obWFwKVxuICAuc2V0Q29udGVudCgnU3RhcnQgZHJhd2luZyB0byBzZWUgdG9vbHRpcCBjaGFuZ2UnKVxuICAuc2V0TGF0TG5nKG5ldyBMLkxhdExuZyhib3VuZHMuZ2V0Tm9ydGgoKSwgYm91bmRzLmdldENlbnRlcigpLmxuZykpO1xuXG5tYXBcbiAgLm9uKCdtb3VzZW1vdmUnLCB1cGRhdGVUb29sdGlwKVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6c3RhcnQnLCBmdW5jdGlvbihldnQpIHtcbiAgICB2YXIgdGV4dCA9IGdldFRvb2x0aXBUZXh0KGV2dC5sYXllcik7XG4gICAgdG9vbHRpcC5zZXRDb250ZW50KHRleHQpO1xuICB9KVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6Y2xpY2tlZCcsIGZ1bmN0aW9uKGV2dCkge1xuICAgIHRvb2x0aXBcbiAgICAgIC5zZXRDb250ZW50KGdldFRvb2x0aXBUZXh0KGV2dC5sYXllciwgdHJ1ZSkpXG4gICAgICAudXBkYXRlUG9zaXRpb24oZXZ0LmxheWVyUG9pbnQpO1xuICB9KVxuICAub24oJ2VkaXRhYmxlOmRyYXdpbmc6ZW5kJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgdG9vbHRpcC5zZXRDb250ZW50KCdTdGFydCBkcmF3aW5nIHRvIHNlZSB0b29sdGlwIGNoYW5nZScpO1xuICB9KTtcblxuXG5mdW5jdGlvbiBnZXRUb29sdGlwVGV4dChsYXllciwgc3RhcnRlZCkge1xuICBpZiAobGF5ZXIgaW5zdGFuY2VvZiBMLlJlY3RhbmdsZSkge1xuICAgIHJldHVybiAnQ2xpY2sgYW5kIGRyYWcgdG8gZHJhdyB0aGUgcmVjdGFuZ2xlJztcbiAgfSBlbHNlIGlmIChsYXllciBpbnN0YW5jZW9mIEwuUG9seWdvbiB8fCBsYXllciBpbnN0YW5jZW9mIEwuUG9seWxpbmUpIHtcbiAgICBpZiAoc3RhcnRlZCkge1xuICAgICAgcmV0dXJuICdDbGljayBsYXN0IHBvaW50IHRvIDxzcGFuIHN0eWxlPVwiY29sb3I6ICNCM0U1RkNcIj5maW5pc2g8L3NwYW4+IGRyYXdpbmcnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ0NsaWNrIG9uIHRoZSBtYXAgdG8gc3RhcnQgZHJhd2luZyc7XG4gICAgfVxuICB9IGVsc2UgaWYgKGxheWVyIGluc3RhbmNlb2YgTC5NYXJrZXIpIHtcbiAgICByZXR1cm4gJ0NsaWNrIG9uIHRoZSBtYXAgdG8gcHV0IHRoZSBtYXJrZXInO1xuICB9IGVsc2UgaWYgKGxheWVyIGluc3RhbmNlb2YgTC5DaXJjbGUpIHtcbiAgICByZXR1cm4gJ0NsaWNrIGFuZCBkcmFnIHRvIGRyYXcgYSBjaXJjbGUnO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRvb2x0aXAoZXZ0KSB7XG4gIHRvb2x0aXAudXBkYXRlUG9zaXRpb24oZXZ0LmxheWVyUG9pbnQpO1xufVxuIiwidmFyIEwgPSByZXF1aXJlKCdsZWFmbGV0Jyk7XG5yZXF1aXJlKCcuL3NyYy9Ub29sdGlwJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gTC5Ub29sdGlwO1xuIiwiJ3VzZSBzdHJpY3QnO1xuKGZ1bmN0aW9uIChmYWN0b3J5LCB3aW5kb3cpIHtcbiAgICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUqL1xuXG4gICAgLy8gZGVmaW5lIGFuIEFNRCBtb2R1bGUgdGhhdCByZWxpZXMgb24gJ2xlYWZsZXQnXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoWydsZWFmbGV0J10sIGZhY3RvcnkpO1xuXG5cbiAgICAvLyBkZWZpbmUgYSBDb21tb24gSlMgbW9kdWxlIHRoYXQgcmVsaWVzIG9uICdsZWFmbGV0J1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdsZWFmbGV0JykpO1xuICAgIH1cblxuICAgIC8vIGF0dGFjaCB5b3VyIHBsdWdpbiB0byB0aGUgZ2xvYmFsICdMJyB2YXJpYWJsZVxuICAgIGlmKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5MKXtcbiAgICAgICAgZmFjdG9yeSh3aW5kb3cuTCk7XG4gICAgfVxuXG59KGZ1bmN0aW9uIChMKSB7XG4gICAgTC5FZGl0YWJsZSA9IEwuRXZlbnRlZC5leHRlbmQoe1xuXG4gICAgICAgIHN0YXRpY3M6IHtcbiAgICAgICAgICAgIEZPUldBUkQ6IDEsXG4gICAgICAgICAgICBCQUNLV0FSRDogLTFcbiAgICAgICAgfSxcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB6SW5kZXg6IDEwMDAsXG4gICAgICAgICAgICBwb2x5Z29uQ2xhc3M6IEwuUG9seWdvbixcbiAgICAgICAgICAgIHBvbHlsaW5lQ2xhc3M6IEwuUG9seWxpbmUsXG4gICAgICAgICAgICBtYXJrZXJDbGFzczogTC5NYXJrZXIsXG4gICAgICAgICAgICByZWN0YW5nbGVDbGFzczogTC5SZWN0YW5nbGUsXG4gICAgICAgICAgICBjaXJjbGVDbGFzczogTC5DaXJjbGUsXG4gICAgICAgICAgICBkcmF3aW5nQ1NTQ2xhc3M6ICdsZWFmbGV0LWVkaXRhYmxlLWRyYXdpbmcnLFxuICAgICAgICAgICAgZHJhd2luZ0N1cnNvcjogJ2Nyb3NzaGFpcidcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLl9sYXN0WkluZGV4ID0gdGhpcy5vcHRpb25zLnpJbmRleDtcbiAgICAgICAgICAgIHRoaXMubWFwID0gbWFwO1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIgPSB0aGlzLmNyZWF0ZUVkaXRMYXllcigpO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlc0xheWVyID0gdGhpcy5jcmVhdGVGZWF0dXJlc0xheWVyKCk7XG4gICAgICAgICAgICB0aGlzLmZvcndhcmRMaW5lR3VpZGUgPSB0aGlzLmNyZWF0ZUxpbmVHdWlkZSgpO1xuICAgICAgICAgICAgdGhpcy5iYWNrd2FyZExpbmVHdWlkZSA9IHRoaXMuY3JlYXRlTGluZUd1aWRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyZUFuZEZvcndhcmQ6IGZ1bmN0aW9uICh0eXBlLCBlKSB7XG4gICAgICAgICAgICBlID0gZSB8fCB7fTtcbiAgICAgICAgICAgIGUuZWRpdFRvb2xzID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuZmlyZSh0eXBlLCBlKTtcbiAgICAgICAgICAgIHRoaXMubWFwLmZpcmUodHlwZSwgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlTGluZUd1aWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IEwuZXh0ZW5kKHtkYXNoQXJyYXk6ICc1LDEwJywgd2VpZ2h0OiAxLCBpbnRlcmFjdGl2ZTogZmFsc2V9LCB0aGlzLm9wdGlvbnMubGluZUd1aWRlT3B0aW9ucyk7XG4gICAgICAgICAgICByZXR1cm4gTC5wb2x5bGluZShbXSwgb3B0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlVmVydGV4SWNvbjogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBMLkJyb3dzZXIudG91Y2ggPyBuZXcgTC5FZGl0YWJsZS5Ub3VjaFZlcnRleEljb24ob3B0aW9ucykgOiBuZXcgTC5FZGl0YWJsZS5WZXJ0ZXhJY29uKG9wdGlvbnMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZUVkaXRMYXllcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5lZGl0TGF5ZXIgfHwgbmV3IEwuTGF5ZXJHcm91cCgpLmFkZFRvKHRoaXMubWFwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVGZWF0dXJlc0xheWVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmZlYXR1cmVzTGF5ZXIgfHwgbmV3IEwuTGF5ZXJHcm91cCgpLmFkZFRvKHRoaXMubWFwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBtb3ZlRm9yd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKGxhdGxuZykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9yd2FyZExpbmVHdWlkZS5fbGF0bG5ncy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcndhcmRMaW5lR3VpZGUuX2xhdGxuZ3NbMV0gPSBsYXRsbmc7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3J3YXJkTGluZUd1aWRlLl9ib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3J3YXJkTGluZUd1aWRlLnJlZHJhdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG1vdmVCYWNrd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKGxhdGxuZykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYmFja3dhcmRMaW5lR3VpZGUuX2xhdGxuZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrd2FyZExpbmVHdWlkZS5fbGF0bG5nc1sxXSA9IGxhdGxuZztcbiAgICAgICAgICAgICAgICB0aGlzLmJhY2t3YXJkTGluZUd1aWRlLl9ib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrd2FyZExpbmVHdWlkZS5yZWRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhbmNob3JGb3J3YXJkTGluZUd1aWRlOiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgICAgICAgICB0aGlzLmZvcndhcmRMaW5lR3VpZGUuX2xhdGxuZ3NbMF0gPSBsYXRsbmc7XG4gICAgICAgICAgICB0aGlzLmZvcndhcmRMaW5lR3VpZGUuX2JvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgICAgICAgIHRoaXMuZm9yd2FyZExpbmVHdWlkZS5yZWRyYXcoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhbmNob3JCYWNrd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKGxhdGxuZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrd2FyZExpbmVHdWlkZS5fbGF0bG5nc1swXSA9IGxhdGxuZztcbiAgICAgICAgICAgIHRoaXMuYmFja3dhcmRMaW5lR3VpZGUuX2JvdW5kcy5leHRlbmQobGF0bG5nKTtcbiAgICAgICAgICAgIHRoaXMuYmFja3dhcmRMaW5lR3VpZGUucmVkcmF3KCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoRm9yd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIuYWRkTGF5ZXIodGhpcy5mb3J3YXJkTGluZUd1aWRlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhdHRhY2hCYWNrd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIuYWRkTGF5ZXIodGhpcy5iYWNrd2FyZExpbmVHdWlkZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGV0YWNoRm9yd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5mb3J3YXJkTGluZUd1aWRlLnNldExhdExuZ3MoW10pO1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIucmVtb3ZlTGF5ZXIodGhpcy5mb3J3YXJkTGluZUd1aWRlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXRhY2hCYWNrd2FyZExpbmVHdWlkZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5iYWNrd2FyZExpbmVHdWlkZS5zZXRMYXRMbmdzKFtdKTtcbiAgICAgICAgICAgIHRoaXMuZWRpdExheWVyLnJlbW92ZUxheWVyKHRoaXMuYmFja3dhcmRMaW5lR3VpZGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGJsb2NrRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBIYWNrOiBmb3JjZSBtYXAgbm90IHRvIGxpc3RlbiB0byBvdGhlciBsYXllcnMgZXZlbnRzIHdoaWxlIGRyYXdpbmcuXG4gICAgICAgICAgICBpZiAoIXRoaXMuX29sZFRhcmdldHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vbGRUYXJnZXRzID0gdGhpcy5tYXAuX3RhcmdldHM7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXAuX3RhcmdldHMgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICB1bmJsb2NrRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fb2xkVGFyZ2V0cykge1xuICAgICAgICAgICAgICAgIC8vIFJlc2V0LCBidXQga2VlcCB0YXJnZXRzIGNyZWF0ZWQgd2hpbGUgZHJhd2luZy5cbiAgICAgICAgICAgICAgICB0aGlzLm1hcC5fdGFyZ2V0cyA9IEwuZXh0ZW5kKHRoaXMubWFwLl90YXJnZXRzLCB0aGlzLl9vbGRUYXJnZXRzKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fb2xkVGFyZ2V0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICByZWdpc3RlckZvckRyYXdpbmc6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmF3aW5nRWRpdG9yKSB0aGlzLnVucmVnaXN0ZXJGb3JEcmF3aW5nKHRoaXMuX2RyYXdpbmdFZGl0b3IpO1xuICAgICAgICAgICAgdGhpcy5tYXAub24oJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCBlZGl0b3Iub25EcmF3aW5nTW91c2VNb3ZlLCBlZGl0b3IpO1xuICAgICAgICAgICAgdGhpcy5ibG9ja0V2ZW50cygpO1xuICAgICAgICAgICAgdGhpcy5fZHJhd2luZ0VkaXRvciA9IGVkaXRvcjtcbiAgICAgICAgICAgIHRoaXMubWFwLm9uKCdtb3VzZWRvd24nLCB0aGlzLm9uTW91c2Vkb3duLCB0aGlzKTtcbiAgICAgICAgICAgIHRoaXMubWFwLm9uKCdtb3VzZXVwJywgdGhpcy5vbk1vdXNldXAsIHRoaXMpO1xuICAgICAgICAgICAgTC5Eb21VdGlsLmFkZENsYXNzKHRoaXMubWFwLl9jb250YWluZXIsIHRoaXMub3B0aW9ucy5kcmF3aW5nQ1NTQ2xhc3MpO1xuICAgICAgICAgICAgdGhpcy5kZWZhdWx0TWFwQ3Vyc29yID0gdGhpcy5tYXAuX2NvbnRhaW5lci5zdHlsZS5jdXJzb3I7XG4gICAgICAgICAgICB0aGlzLm1hcC5fY29udGFpbmVyLnN0eWxlLmN1cnNvciA9IHRoaXMub3B0aW9ucy5kcmF3aW5nQ3Vyc29yO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVucmVnaXN0ZXJGb3JEcmF3aW5nOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICB0aGlzLnVuYmxvY2tFdmVudHMoKTtcbiAgICAgICAgICAgIEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLm1hcC5fY29udGFpbmVyLCB0aGlzLm9wdGlvbnMuZHJhd2luZ0NTU0NsYXNzKTtcbiAgICAgICAgICAgIHRoaXMubWFwLl9jb250YWluZXIuc3R5bGUuY3Vyc29yID0gdGhpcy5kZWZhdWx0TWFwQ3Vyc29yO1xuICAgICAgICAgICAgZWRpdG9yID0gZWRpdG9yIHx8IHRoaXMuX2RyYXdpbmdFZGl0b3I7XG4gICAgICAgICAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5tYXAub2ZmKCdtb3VzZW1vdmUgdG91Y2htb3ZlJywgZWRpdG9yLm9uRHJhd2luZ01vdXNlTW92ZSwgZWRpdG9yKTtcbiAgICAgICAgICAgIHRoaXMubWFwLm9mZignbW91c2Vkb3duJywgdGhpcy5vbk1vdXNlZG93biwgdGhpcyk7XG4gICAgICAgICAgICB0aGlzLm1hcC5vZmYoJ21vdXNldXAnLCB0aGlzLm9uTW91c2V1cCwgdGhpcyk7XG4gICAgICAgICAgICBpZiAoZWRpdG9yICE9PSB0aGlzLl9kcmF3aW5nRWRpdG9yKSByZXR1cm47XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZHJhd2luZ0VkaXRvcjtcbiAgICAgICAgICAgIGlmIChlZGl0b3IuX2RyYXdpbmcpIGVkaXRvci5jYW5jZWxEcmF3aW5nKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3VzZWRvd246IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLl9tb3VzZURvd24gPSBlO1xuICAgICAgICAgICAgdGhpcy5fZHJhd2luZ0VkaXRvci5vbkRyYXdpbmdNb3VzZURvd24oZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3VzZXVwOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX21vdXNlRG93bikge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW4gPSBMLnBvaW50KHRoaXMuX21vdXNlRG93bi5vcmlnaW5hbEV2ZW50LmNsaWVudFgsIHRoaXMuX21vdXNlRG93bi5vcmlnaW5hbEV2ZW50LmNsaWVudFkpO1xuICAgICAgICAgICAgICAgIHZhciBkaXN0YW5jZSA9IEwucG9pbnQoZS5vcmlnaW5hbEV2ZW50LmNsaWVudFgsIGUub3JpZ2luYWxFdmVudC5jbGllbnRZKS5kaXN0YW5jZVRvKG9yaWdpbik7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlKSA8IDkgKiAod2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSkpIHRoaXMuX2RyYXdpbmdFZGl0b3Iub25EcmF3aW5nQ2xpY2soZSk7XG4gICAgICAgICAgICAgICAgZWxzZSB0aGlzLl9kcmF3aW5nRWRpdG9yLm9uRHJhd2luZ01vdXNlVXAoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9tb3VzZURvd24gPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXdpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kcmF3aW5nRWRpdG9yICYmIHRoaXMuX2RyYXdpbmdFZGl0b3IuZHJhd2luZygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BEcmF3aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJGb3JEcmF3aW5nKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tbWl0RHJhd2luZzogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhd2luZ0VkaXRvcikgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5fZHJhd2luZ0VkaXRvci5jb21taXREcmF3aW5nKGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbm5lY3RDcmVhdGVkVG9NYXA6IGZ1bmN0aW9uIChsYXllcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmVhdHVyZXNMYXllci5hZGRMYXllcihsYXllcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRQb2x5bGluZTogZnVuY3Rpb24gKGxhdGxuZywgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSB0aGlzLmNyZWF0ZVBvbHlsaW5lKFtdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGxpbmUuZW5hYmxlRWRpdCh0aGlzLm1hcCkubmV3U2hhcGUobGF0bG5nKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0YXJ0UG9seWdvbjogZnVuY3Rpb24gKGxhdGxuZywgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIHBvbHlnb24gPSB0aGlzLmNyZWF0ZVBvbHlnb24oW10sIG9wdGlvbnMpO1xuICAgICAgICAgICAgcG9seWdvbi5lbmFibGVFZGl0KHRoaXMubWFwKS5uZXdTaGFwZShsYXRsbmcpO1xuICAgICAgICAgICAgcmV0dXJuIHBvbHlnb247XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRNYXJrZXI6IGZ1bmN0aW9uIChsYXRsbmcsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGxhdGxuZyA9IGxhdGxuZyB8fCB0aGlzLm1hcC5nZXRDZW50ZXIoKS5jbG9uZSgpO1xuICAgICAgICAgICAgdmFyIG1hcmtlciA9IHRoaXMuY3JlYXRlTWFya2VyKGxhdGxuZywgb3B0aW9ucyk7XG4gICAgICAgICAgICBtYXJrZXIuZW5hYmxlRWRpdCh0aGlzLm1hcCkuc3RhcnREcmF3aW5nKCk7XG4gICAgICAgICAgICByZXR1cm4gbWFya2VyO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0YXJ0UmVjdGFuZ2xlOiBmdW5jdGlvbihsYXRsbmcsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBjb3JuZXIgPSBsYXRsbmcgfHwgTC5sYXRMbmcoWzAsIDBdKTtcbiAgICAgICAgICAgIHZhciBib3VuZHMgPSBuZXcgTC5MYXRMbmdCb3VuZHMoY29ybmVyLCBjb3JuZXIpO1xuICAgICAgICAgICAgdmFyIHJlY3RhbmdsZSA9IHRoaXMuY3JlYXRlUmVjdGFuZ2xlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgICAgICAgICByZWN0YW5nbGUuZW5hYmxlRWRpdCh0aGlzLm1hcCkuc3RhcnREcmF3aW5nKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjdGFuZ2xlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0YXJ0Q2lyY2xlOiBmdW5jdGlvbiAobGF0bG5nLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBsYXRsbmcgPSBsYXRsbmcgfHwgdGhpcy5tYXAuZ2V0Q2VudGVyKCkuY2xvbmUoKTtcbiAgICAgICAgICAgIHZhciBjaXJjbGUgPSB0aGlzLmNyZWF0ZUNpcmNsZShsYXRsbmcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2lyY2xlLmVuYWJsZUVkaXQodGhpcy5tYXApLnN0YXJ0RHJhd2luZygpO1xuICAgICAgICAgICAgcmV0dXJuIGNpcmNsZTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdGFydEhvbGU6IGZ1bmN0aW9uIChlZGl0b3IsIGxhdGxuZykge1xuICAgICAgICAgICAgZWRpdG9yLm5ld0hvbGUobGF0bG5nKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVMYXllcjogZnVuY3Rpb24gKGtsYXNzLCBsYXRsbmdzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gTC5VdGlsLmV4dGVuZCh7ZWRpdE9wdGlvbnM6IHtlZGl0VG9vbHM6IHRoaXN9fSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSBuZXcga2xhc3MobGF0bG5ncywgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpjcmVhdGVkJywge2xheWVyOiBsYXllcn0pO1xuICAgICAgICAgICAgcmV0dXJuIGxheWVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZVBvbHlsaW5lOiBmdW5jdGlvbiAobGF0bG5ncywgb3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlTGF5ZXIob3B0aW9ucyAmJiBvcHRpb25zLnBvbHlsaW5lQ2xhc3MgfHwgdGhpcy5vcHRpb25zLnBvbHlsaW5lQ2xhc3MsIGxhdGxuZ3MsIG9wdGlvbnMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZVBvbHlnb246IGZ1bmN0aW9uIChsYXRsbmdzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVMYXllcihvcHRpb25zICYmIG9wdGlvbnMucG9seWdvbkNsYXNzIHx8IHRoaXMub3B0aW9ucy5wb2x5Z29uQ2xhc3MsIGxhdGxuZ3MsIG9wdGlvbnMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24gKGxhdGxuZywgb3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlTGF5ZXIob3B0aW9ucyAmJiBvcHRpb25zLm1hcmtlckNsYXNzIHx8IHRoaXMub3B0aW9ucy5tYXJrZXJDbGFzcywgbGF0bG5nLCBvcHRpb25zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVSZWN0YW5nbGU6IGZ1bmN0aW9uIChib3VuZHMsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUxheWVyKG9wdGlvbnMgJiYgb3B0aW9ucy5yZWN0YW5nbGVDbGFzcyB8fCB0aGlzLm9wdGlvbnMucmVjdGFuZ2xlQ2xhc3MsIGJvdW5kcywgb3B0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlQ2lyY2xlOiBmdW5jdGlvbiAobGF0bG5nLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVMYXllcihvcHRpb25zICYmIG9wdGlvbnMuY2lyY2xlQ2xhc3MgfHwgdGhpcy5vcHRpb25zLmNpcmNsZUNsYXNzLCBsYXRsbmcsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIEwuZXh0ZW5kKEwuRWRpdGFibGUsIHtcblxuICAgICAgICBtYWtlQ2FuY2VsbGFibGU6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlLl9jYW5jZWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLk1hcC5tZXJnZU9wdGlvbnMoe1xuICAgICAgICBlZGl0VG9vbHNDbGFzczogTC5FZGl0YWJsZVxuICAgIH0pO1xuXG4gICAgTC5NYXAuYWRkSW5pdEhvb2soZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHRoaXMud2hlblJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZWRpdGFibGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVkaXRUb29scyA9IG5ldyB0aGlzLm9wdGlvbnMuZWRpdFRvb2xzQ2xhc3ModGhpcywgdGhpcy5vcHRpb25zLmVkaXRPcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIEwuRWRpdGFibGUuVmVydGV4SWNvbiA9IEwuRGl2SWNvbi5leHRlbmQoe1xuXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGljb25TaXplOiBuZXcgTC5Qb2ludCg4LCA4KVxuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIEwuRWRpdGFibGUuVG91Y2hWZXJ0ZXhJY29uID0gTC5FZGl0YWJsZS5WZXJ0ZXhJY29uLmV4dGVuZCh7XG5cbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgaWNvblNpemU6IG5ldyBMLlBvaW50KDIwLCAyMClcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cblxuICAgIEwuRWRpdGFibGUuVmVydGV4TWFya2VyID0gTC5NYXJrZXIuZXh0ZW5kKHtcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBkcmFnZ2FibGU6IHRydWUsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdsZWFmbGV0LWRpdi1pY29uIGxlYWZsZXQtdmVydGV4LWljb24nXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGxhdGxuZywgbGF0bG5ncywgZWRpdG9yLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBXZSBkb24ndCB1c2UgdGhpcy5fbGF0bG5nLCBiZWNhdXNlIG9uIGRyYWcgTGVhZmxldCByZXBsYWNlIGl0IHdoaWxlXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGtlZXAgcmVmZXJlbmNlLlxuICAgICAgICAgICAgdGhpcy5sYXRsbmcgPSBsYXRsbmc7XG4gICAgICAgICAgICB0aGlzLmxhdGxuZ3MgPSBsYXRsbmdzO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3IgPSBlZGl0b3I7XG4gICAgICAgICAgICBMLk1hcmtlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIGxhdGxuZywgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuaWNvbiA9IHRoaXMuZWRpdG9yLnRvb2xzLmNyZWF0ZVZlcnRleEljb24oe2NsYXNzTmFtZTogdGhpcy5vcHRpb25zLmNsYXNzTmFtZX0pO1xuICAgICAgICAgICAgdGhpcy5sYXRsbmcuX192ZXJ0ZXggPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZWRpdExheWVyLmFkZExheWVyKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5zZXRaSW5kZXhPZmZzZXQoZWRpdG9yLnRvb2xzLl9sYXN0WkluZGV4ICsgMSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgIEwuTWFya2VyLnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIG1hcCk7XG4gICAgICAgICAgICB0aGlzLm9uKCdkcmFnJywgdGhpcy5vbkRyYWcpO1xuICAgICAgICAgICAgdGhpcy5vbignZHJhZ3N0YXJ0JywgdGhpcy5vbkRyYWdTdGFydCk7XG4gICAgICAgICAgICB0aGlzLm9uKCdkcmFnZW5kJywgdGhpcy5vbkRyYWdFbmQpO1xuICAgICAgICAgICAgdGhpcy5vbignbW91c2V1cCcsIHRoaXMub25Nb3VzZXVwKTtcbiAgICAgICAgICAgIHRoaXMub24oJ2NsaWNrJywgdGhpcy5vbkNsaWNrKTtcbiAgICAgICAgICAgIHRoaXMub24oJ2NvbnRleHRtZW51JywgdGhpcy5vbkNvbnRleHRNZW51KTtcbiAgICAgICAgICAgIHRoaXMub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5vbk1vdXNlRG93bik7XG4gICAgICAgICAgICB0aGlzLmFkZE1pZGRsZU1hcmtlcnMoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvblJlbW92ZTogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubWlkZGxlTWFya2VyKSB0aGlzLm1pZGRsZU1hcmtlci5kZWxldGUoKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmxhdGxuZy5fX3ZlcnRleDtcbiAgICAgICAgICAgIHRoaXMub2ZmKCdkcmFnJywgdGhpcy5vbkRyYWcpO1xuICAgICAgICAgICAgdGhpcy5vZmYoJ2RyYWdzdGFydCcsIHRoaXMub25EcmFnU3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5vZmYoJ2RyYWdlbmQnLCB0aGlzLm9uRHJhZ0VuZCk7XG4gICAgICAgICAgICB0aGlzLm9mZignbW91c2V1cCcsIHRoaXMub25Nb3VzZXVwKTtcbiAgICAgICAgICAgIHRoaXMub2ZmKCdjbGljaycsIHRoaXMub25DbGljayk7XG4gICAgICAgICAgICB0aGlzLm9mZignY29udGV4dG1lbnUnLCB0aGlzLm9uQ29udGV4dE1lbnUpO1xuICAgICAgICAgICAgdGhpcy5vZmYoJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5vbk1vdXNlRG93bik7XG4gICAgICAgICAgICBMLk1hcmtlci5wcm90b3R5cGUub25SZW1vdmUuY2FsbCh0aGlzLCBtYXApO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhZzogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUudmVydGV4ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLm9uVmVydGV4TWFya2VyRHJhZyhlKTtcbiAgICAgICAgICAgIHZhciBpY29uUG9zID0gTC5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2ljb24pLFxuICAgICAgICAgICAgICAgIGxhdGxuZyA9IHRoaXMuX21hcC5sYXllclBvaW50VG9MYXRMbmcoaWNvblBvcyk7XG4gICAgICAgICAgICB0aGlzLmxhdGxuZy51cGRhdGUobGF0bG5nKTtcbiAgICAgICAgICAgIHRoaXMuX2xhdGxuZyA9IHRoaXMubGF0bG5nOyAgLy8gUHVzaCBiYWNrIHRvIExlYWZsZXQgb3VyIHJlZmVyZW5jZS5cbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLnJlZnJlc2goKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm1pZGRsZU1hcmtlcikge1xuICAgICAgICAgICAgICAgIHRoaXMubWlkZGxlTWFya2VyLnVwZGF0ZUxhdExuZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5leHQgPSB0aGlzLmdldE5leHQoKTtcbiAgICAgICAgICAgIGlmIChuZXh0ICYmIG5leHQubWlkZGxlTWFya2VyKSB7XG4gICAgICAgICAgICAgICAgbmV4dC5taWRkbGVNYXJrZXIudXBkYXRlTGF0TG5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnU3RhcnQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnZlcnRleCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5vblZlcnRleE1hcmtlckRyYWdTdGFydChlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdFbmQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnZlcnRleCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5vblZlcnRleE1hcmtlckRyYWdFbmQoZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25DbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUudmVydGV4ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLm9uVmVydGV4TWFya2VyQ2xpY2soZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3VzZXVwOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgTC5Eb21FdmVudC5zdG9wKGUpO1xuICAgICAgICAgICAgZS52ZXJ0ZXggPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3IubWFwLmZpcmUoJ21vdXNldXAnLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkNvbnRleHRNZW51OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS52ZXJ0ZXggPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3Iub25WZXJ0ZXhNYXJrZXJDb250ZXh0TWVudShlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbk1vdXNlRG93bjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUudmVydGV4ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLm9uVmVydGV4TWFya2VyTW91c2VEb3duKGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSB0aGlzLmdldE5leHQoKTsgIC8vIENvbXB1dGUgYmVmb3JlIGNoYW5naW5nIGxhdGxuZ1xuICAgICAgICAgICAgdGhpcy5sYXRsbmdzLnNwbGljZSh0aGlzLmdldEluZGV4KCksIDEpO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZWRpdExheWVyLnJlbW92ZUxheWVyKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5lZGl0b3Iub25WZXJ0ZXhEZWxldGVkKHtsYXRsbmc6IHRoaXMubGF0bG5nLCB2ZXJ0ZXg6IHRoaXN9KTtcbiAgICAgICAgICAgIGlmICghdGhpcy5sYXRsbmdzLmxlbmd0aCkgdGhpcy5lZGl0b3IuZGVsZXRlU2hhcGUodGhpcy5sYXRsbmdzKTtcbiAgICAgICAgICAgIGlmIChuZXh0KSBuZXh0LnJlc2V0TWlkZGxlTWFya2VyKCk7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5yZWZyZXNoKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0SW5kZXg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhdGxuZ3MuaW5kZXhPZih0aGlzLmxhdGxuZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0TGFzdEluZGV4OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXRsbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UHJldmlvdXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGxuZ3MubGVuZ3RoIDwgMikgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5nZXRJbmRleCgpLFxuICAgICAgICAgICAgICAgIHByZXZpb3VzSW5kZXggPSBpbmRleCAtIDE7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgdGhpcy5lZGl0b3IuQ0xPU0VEKSBwcmV2aW91c0luZGV4ID0gdGhpcy5nZXRMYXN0SW5kZXgoKTtcbiAgICAgICAgICAgIHZhciBwcmV2aW91cyA9IHRoaXMubGF0bG5nc1twcmV2aW91c0luZGV4XTtcbiAgICAgICAgICAgIGlmIChwcmV2aW91cykgcmV0dXJuIHByZXZpb3VzLl9fdmVydGV4O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGxuZ3MubGVuZ3RoIDwgMikgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5nZXRJbmRleCgpLFxuICAgICAgICAgICAgICAgIG5leHRJbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gdGhpcy5nZXRMYXN0SW5kZXgoKSAmJiB0aGlzLmVkaXRvci5DTE9TRUQpIG5leHRJbmRleCA9IDA7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IHRoaXMubGF0bG5nc1tuZXh0SW5kZXhdO1xuICAgICAgICAgICAgaWYgKG5leHQpIHJldHVybiBuZXh0Ll9fdmVydGV4O1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZE1pZGRsZU1hcmtlcjogZnVuY3Rpb24gKHByZXZpb3VzKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZWRpdG9yLmhhc01pZGRsZU1hcmtlcnMoKSkgcmV0dXJuO1xuICAgICAgICAgICAgcHJldmlvdXMgPSBwcmV2aW91cyB8fCB0aGlzLmdldFByZXZpb3VzKCk7XG4gICAgICAgICAgICBpZiAocHJldmlvdXMgJiYgIXRoaXMubWlkZGxlTWFya2VyKSB0aGlzLm1pZGRsZU1hcmtlciA9IHRoaXMuZWRpdG9yLmFkZE1pZGRsZU1hcmtlcihwcmV2aW91cywgdGhpcywgdGhpcy5sYXRsbmdzLCB0aGlzLmVkaXRvcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkTWlkZGxlTWFya2VyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVkaXRvci5oYXNNaWRkbGVNYXJrZXJzKCkpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBwcmV2aW91cyA9IHRoaXMuZ2V0UHJldmlvdXMoKTtcbiAgICAgICAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkTWlkZGxlTWFya2VyKHByZXZpb3VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZXh0ID0gdGhpcy5nZXROZXh0KCk7XG4gICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgIG5leHQucmVzZXRNaWRkbGVNYXJrZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICByZXNldE1pZGRsZU1hcmtlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubWlkZGxlTWFya2VyKSB0aGlzLm1pZGRsZU1hcmtlci5kZWxldGUoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkTWlkZGxlTWFya2VyKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3BsaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5lZGl0b3Iuc3BsaXRTaGFwZSkgcmV0dXJuOyAgLy8gT25seSBmb3IgUG9seWxpbmVFZGl0b3JcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLnNwbGl0U2hhcGUodGhpcy5sYXRsbmdzLCB0aGlzLmdldEluZGV4KCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZWRpdG9yLmNvbnRpbnVlQmFja3dhcmQpIHJldHVybjsgIC8vIE9ubHkgZm9yIFBvbHlsaW5lRWRpdG9yXG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmdldEluZGV4KCk7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IDApIHRoaXMuZWRpdG9yLmNvbnRpbnVlQmFja3dhcmQodGhpcy5sYXRsbmdzKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGluZGV4ID09PSB0aGlzLmdldExhc3RJbmRleCgpKSB0aGlzLmVkaXRvci5jb250aW51ZUZvcndhcmQodGhpcy5sYXRsbmdzKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLkVkaXRhYmxlLm1lcmdlT3B0aW9ucyh7XG4gICAgICAgIHZlcnRleE1hcmtlckNsYXNzOiBMLkVkaXRhYmxlLlZlcnRleE1hcmtlclxuICAgIH0pO1xuXG4gICAgTC5FZGl0YWJsZS5NaWRkbGVNYXJrZXIgPSBMLk1hcmtlci5leHRlbmQoe1xuXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAuNSxcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ2xlYWZsZXQtZGl2LWljb24gbGVhZmxldC1taWRkbGUtaWNvbicsXG4gICAgICAgICAgICBkcmFnZ2FibGU6IHRydWVcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAobGVmdCwgcmlnaHQsIGxhdGxuZ3MsIGVkaXRvciwgb3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5sZWZ0ID0gbGVmdDtcbiAgICAgICAgICAgIHRoaXMucmlnaHQgPSByaWdodDtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yID0gZWRpdG9yO1xuICAgICAgICAgICAgdGhpcy5sYXRsbmdzID0gbGF0bG5ncztcbiAgICAgICAgICAgIEwuTWFya2VyLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgdGhpcy5jb21wdXRlTGF0TG5nKCksIG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy5fb3BhY2l0eSA9IHRoaXMub3B0aW9ucy5vcGFjaXR5O1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLmljb24gPSB0aGlzLmVkaXRvci50b29scy5jcmVhdGVWZXJ0ZXhJY29uKHtjbGFzc05hbWU6IHRoaXMub3B0aW9ucy5jbGFzc05hbWV9KTtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLmVkaXRMYXllci5hZGRMYXllcih0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VmlzaWJpbGl0eSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldFZpc2liaWxpdHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0UG9pbnQgPSB0aGlzLl9tYXAubGF0TG5nVG9Db250YWluZXJQb2ludCh0aGlzLmxlZnQubGF0bG5nKSxcbiAgICAgICAgICAgICAgICByaWdodFBvaW50ID0gdGhpcy5fbWFwLmxhdExuZ1RvQ29udGFpbmVyUG9pbnQodGhpcy5yaWdodC5sYXRsbmcpLFxuICAgICAgICAgICAgICAgIHNpemUgPSBMLnBvaW50KHRoaXMub3B0aW9ucy5pY29uLm9wdGlvbnMuaWNvblNpemUpO1xuICAgICAgICAgICAgaWYgKGxlZnRQb2ludC5kaXN0YW5jZVRvKHJpZ2h0UG9pbnQpIDwgc2l6ZS54ICogMykge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzaG93OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnNldE9wYWNpdHkodGhpcy5fb3BhY2l0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGlkZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zZXRPcGFjaXR5KDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZUxhdExuZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zZXRMYXRMbmcodGhpcy5jb21wdXRlTGF0TG5nKCkpO1xuICAgICAgICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcHV0ZUxhdExuZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxlZnRQb2ludCA9IHRoaXMuZWRpdG9yLm1hcC5sYXRMbmdUb0NvbnRhaW5lclBvaW50KHRoaXMubGVmdC5sYXRsbmcpLFxuICAgICAgICAgICAgICAgIHJpZ2h0UG9pbnQgPSB0aGlzLmVkaXRvci5tYXAubGF0TG5nVG9Db250YWluZXJQb2ludCh0aGlzLnJpZ2h0LmxhdGxuZyksXG4gICAgICAgICAgICAgICAgeSA9IChsZWZ0UG9pbnQueSArIHJpZ2h0UG9pbnQueSkgLyAyLFxuICAgICAgICAgICAgICAgIHggPSAobGVmdFBvaW50LnggKyByaWdodFBvaW50LngpIC8gMjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVkaXRvci5tYXAuY29udGFpbmVyUG9pbnRUb0xhdExuZyhbeCwgeV0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICBMLk1hcmtlci5wcm90b3R5cGUub25BZGQuY2FsbCh0aGlzLCBtYXApO1xuICAgICAgICAgICAgTC5Eb21FdmVudC5vbih0aGlzLl9pY29uLCAnbW91c2Vkb3duIHRvdWNoc3RhcnQnLCB0aGlzLm9uTW91c2VEb3duLCB0aGlzKTtcbiAgICAgICAgICAgIG1hcC5vbignem9vbWVuZCcsIHRoaXMuc2V0VmlzaWJpbGl0eSwgdGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25SZW1vdmU6IGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnJpZ2h0Lm1pZGRsZU1hcmtlcjtcbiAgICAgICAgICAgIEwuRG9tRXZlbnQub2ZmKHRoaXMuX2ljb24sICdtb3VzZWRvd24gdG91Y2hzdGFydCcsIHRoaXMub25Nb3VzZURvd24sIHRoaXMpO1xuICAgICAgICAgICAgbWFwLm9mZignem9vbWVuZCcsIHRoaXMuc2V0VmlzaWJpbGl0eSwgdGhpcyk7XG4gICAgICAgICAgICBMLk1hcmtlci5wcm90b3R5cGUub25SZW1vdmUuY2FsbCh0aGlzLCBtYXApO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uTW91c2VEb3duOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIGljb25Qb3MgPSBMLkRvbVV0aWwuZ2V0UG9zaXRpb24odGhpcy5faWNvbiksXG4gICAgICAgICAgICAgICAgbGF0bG5nID0gdGhpcy5lZGl0b3IubWFwLmxheWVyUG9pbnRUb0xhdExuZyhpY29uUG9zKTtcbiAgICAgICAgICAgIGUgPSB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxFdmVudDogZSxcbiAgICAgICAgICAgICAgICBsYXRsbmc6IGxhdGxuZ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMub3BhY2l0eSA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgTC5FZGl0YWJsZS5tYWtlQ2FuY2VsbGFibGUoZSk7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5vbk1pZGRsZU1hcmtlck1vdXNlRG93bihlKTtcbiAgICAgICAgICAgIGlmIChlLl9jYW5jZWxsZWQpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMubGF0bG5ncy5zcGxpY2UodGhpcy5pbmRleCgpLCAwLCBlLmxhdGxuZyk7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5yZWZyZXNoKCk7XG4gICAgICAgICAgICB2YXIgaWNvbiA9IHRoaXMuX2ljb247XG4gICAgICAgICAgICB2YXIgbWFya2VyID0gdGhpcy5lZGl0b3IuYWRkVmVydGV4TWFya2VyKGUubGF0bG5nLCB0aGlzLmxhdGxuZ3MpO1xuICAgICAgICAgICAgLyogSGFjayB0byB3b3JrYXJvdW5kIGJyb3dzZXIgbm90IGZpcmluZyB0b3VjaGVuZCB3aGVuIGVsZW1lbnQgaXMgbm8gbW9yZSBvbiBET00gKi9cbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBtYXJrZXIuX2ljb24ucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChtYXJrZXIuX2ljb24pO1xuICAgICAgICAgICAgbWFya2VyLl9pY29uID0gaWNvbjtcbiAgICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChtYXJrZXIuX2ljb24pO1xuICAgICAgICAgICAgbWFya2VyLl9pbml0SWNvbigpO1xuICAgICAgICAgICAgbWFya2VyLl9pbml0SW50ZXJhY3Rpb24oKTtcbiAgICAgICAgICAgIG1hcmtlci5zZXRPcGFjaXR5KDEpO1xuICAgICAgICAgICAgLyogRW5kIGhhY2sgKi9cbiAgICAgICAgICAgIC8vIFRyYW5zZmVyIG9uZ29pbmcgZHJhZ2dpbmcgdG8gcmVhbCBtYXJrZXJcbiAgICAgICAgICAgIEwuRHJhZ2dhYmxlLl9kcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgbWFya2VyLmRyYWdnaW5nLl9kcmFnZ2FibGUuX29uRG93bihlLm9yaWdpbmFsRXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yLmVkaXRMYXllci5yZW1vdmVMYXllcih0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbmRleDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGF0bG5ncy5pbmRleE9mKHRoaXMucmlnaHQubGF0bG5nKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLkVkaXRhYmxlLm1lcmdlT3B0aW9ucyh7XG4gICAgICAgIG1pZGRsZU1hcmtlckNsYXNzOiBMLkVkaXRhYmxlLk1pZGRsZU1hcmtlclxuICAgIH0pO1xuXG4gICAgTC5FZGl0YWJsZS5CYXNlRWRpdG9yID0gTC5DbGFzcy5leHRlbmQoe1xuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChtYXAsIGZlYXR1cmUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHRoaXMubWFwID0gbWFwO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlID0gZmVhdHVyZTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5lZGl0b3IgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIgPSBuZXcgTC5MYXllckdyb3VwKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzID0gdGhpcy5vcHRpb25zLmVkaXRUb29scyB8fCBtYXAuZWRpdFRvb2xzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2VuYWJsZWQpIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQoKSkgdGhpcy50b29scy5lZGl0TGF5ZXIuYWRkTGF5ZXIodGhpcy5lZGl0TGF5ZXIpO1xuICAgICAgICAgICAgdGhpcy5vbkVuYWJsZSgpO1xuICAgICAgICAgICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUub24oJ3JlbW92ZScsIHRoaXMuZGlzYWJsZSwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUub2ZmKCdyZW1vdmUnLCB0aGlzLmRpc2FibGUsIHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5lZGl0TGF5ZXIuY2xlYXJMYXllcnMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZWRpdExheWVyLnJlbW92ZUxheWVyKHRoaXMuZWRpdExheWVyKTtcbiAgICAgICAgICAgIHRoaXMub25EaXNhYmxlKCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZW5hYmxlZDtcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmF3aW5nKSB0aGlzLmNhbmNlbERyYXdpbmcoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXdpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuX2RyYXdpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFzTWlkZGxlTWFya2VyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLm9wdGlvbnMuc2tpcE1pZGRsZU1hcmtlcnMgJiYgIXRoaXMudG9vbHMub3B0aW9ucy5za2lwTWlkZGxlTWFya2VycztcbiAgICAgICAgfSxcblxuICAgICAgICBmaXJlQW5kRm9yd2FyZDogZnVuY3Rpb24gKHR5cGUsIGUpIHtcbiAgICAgICAgICAgIGUgPSBlIHx8IHt9O1xuICAgICAgICAgICAgZS5sYXllciA9IHRoaXMuZmVhdHVyZTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5maXJlKHR5cGUsIGUpO1xuICAgICAgICAgICAgdGhpcy50b29scy5maXJlQW5kRm9yd2FyZCh0eXBlLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6ZW5hYmxlJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpkaXNhYmxlJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25FZGl0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTplZGl0aW5nJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25TdGFydERyYXdpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOmRyYXdpbmc6c3RhcnQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkVuZERyYXdpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOmRyYXdpbmc6ZW5kJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25DYW5jZWxEcmF3aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpkcmF3aW5nOmNhbmNlbCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uQ29tbWl0RHJhd2luZzogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOmRyYXdpbmc6Y29tbWl0JywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmF3aW5nTW91c2VEb3duOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6ZHJhd2luZzptb3VzZWRvd24nLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYXdpbmdNb3VzZVVwOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6ZHJhd2luZzptb3VzZXVwJywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnREcmF3aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYXdpbmcpIHRoaXMuX2RyYXdpbmcgPSBMLkVkaXRhYmxlLkZPUldBUkQ7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnJlZ2lzdGVyRm9yRHJhd2luZyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMub25TdGFydERyYXdpbmcoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb21taXREcmF3aW5nOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkNvbW1pdERyYXdpbmcoZSk7XG4gICAgICAgICAgICB0aGlzLmVuZERyYXdpbmcoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYW5jZWxEcmF3aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLm9uQ2FuY2VsRHJhd2luZygpO1xuICAgICAgICAgICAgdGhpcy5lbmREcmF3aW5nKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5kRHJhd2luZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fZHJhd2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50b29scy51bnJlZ2lzdGVyRm9yRHJhd2luZyh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMub25FbmREcmF3aW5nKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmF3aW5nQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZHJhd2luZykgcmV0dXJuO1xuICAgICAgICAgICAgTC5FZGl0YWJsZS5tYWtlQ2FuY2VsbGFibGUoZSk7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpkcmF3aW5nOmNsaWNrJywgZSk7XG4gICAgICAgICAgICBpZiAoZS5fY2FuY2VsbGVkKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQoKSkgdGhpcy5jb25uZWN0KGUpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzRHJhd2luZ0NsaWNrKGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzQ29ubmVjdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXAuaGFzTGF5ZXIodGhpcy5mZWF0dXJlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb25uZWN0OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy50b29scy5jb25uZWN0Q3JlYXRlZFRvTWFwKHRoaXMuZmVhdHVyZSk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmVkaXRMYXllci5hZGRMYXllcih0aGlzLmVkaXRMYXllcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6ZHJhd2luZzptb3ZlJywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmF3aW5nTW91c2VNb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbk1vdmUoZSk7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgTC5FZGl0YWJsZS5NYXJrZXJFZGl0b3IgPSBMLkVkaXRhYmxlLkJhc2VFZGl0b3IuZXh0ZW5kKHtcblxuICAgICAgICBlbmFibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9lbmFibGVkKSByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUuZW5hYmxlLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCgpKSB0aGlzLmVuYWJsZURyYWdnaW5nKCk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuZmVhdHVyZS5vbignYWRkJywgdGhpcy5lbmFibGVEcmFnZ2luZywgdGhpcyk7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUub24oJ2RyYWdzdGFydCcsIHRoaXMub25FZGl0aW5nLCB0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5vbignZHJhZycsIHRoaXMub25Nb3ZlLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUuZGlzYWJsZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZmVhdHVyZS5kcmFnZ2luZykgdGhpcy5mZWF0dXJlLmRyYWdnaW5nLmRpc2FibGUoKTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5vZmYoJ2RyYWdzdGFydCcsIHRoaXMub25FZGl0aW5nLCB0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5vZmYoJ2RyYWcnLCB0aGlzLm9uTW92ZSwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBlbmFibGVEcmFnZ2luZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLmRyYWdnaW5nLmVuYWJsZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhd2luZ01vdXNlTW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUub25EcmF3aW5nTW91c2VNb3ZlLmNhbGwodGhpcywgZSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fZHJhd2luZykgdGhpcy5mZWF0dXJlLnNldExhdExuZyhlLmxhdGxuZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcHJvY2Vzc0RyYXdpbmdDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOmRyYXdpbmc6Y2xpY2tlZCcsIGUpO1xuICAgICAgICAgICAgdGhpcy5jb21taXREcmF3aW5nKGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbm5lY3Q6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAvLyBPbiB0b3VjaCwgdGhlIGxhdGxuZyBoYXMgbm90IGJlZW4gdXBkYXRlZCBiZWNhdXNlIHRoZXJlIGlzXG4gICAgICAgICAgICAvLyBubyBtb3VzZW1vdmUuXG4gICAgICAgICAgICBpZiAoZSkgdGhpcy5mZWF0dXJlLl9sYXRsbmcgPSBlLmxhdGxuZztcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUuY29ubmVjdC5jYWxsKHRoaXMsIGUpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIEwuRWRpdGFibGUuUGF0aEVkaXRvciA9IEwuRWRpdGFibGUuQmFzZUVkaXRvci5leHRlbmQoe1xuXG4gICAgICAgIENMT1NFRDogZmFsc2UsXG4gICAgICAgIE1JTl9WRVJURVg6IDIsXG5cbiAgICAgICAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZW5hYmxlZCkgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICBMLkVkaXRhYmxlLkJhc2VFZGl0b3IucHJvdG90eXBlLmVuYWJsZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZmVhdHVyZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFZlcnRleE1hcmtlcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBMLkVkaXRhYmxlLkJhc2VFZGl0b3IucHJvdG90eXBlLmRpc2FibGUuY2FsbCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0VmVydGV4TWFya2VyczogZnVuY3Rpb24gKGxhdGxuZ3MpIHtcbiAgICAgICAgICAgIGxhdGxuZ3MgPSBsYXRsbmdzIHx8IHRoaXMuZ2V0TGF0TG5ncygpO1xuICAgICAgICAgICAgaWYgKEwuUG9seWxpbmUuX2ZsYXQobGF0bG5ncykpIHRoaXMuYWRkVmVydGV4TWFya2VycyhsYXRsbmdzKTtcbiAgICAgICAgICAgIGVsc2UgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRsbmdzLmxlbmd0aDsgaSsrKSB0aGlzLmluaXRWZXJ0ZXhNYXJrZXJzKGxhdGxuZ3NbaV0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldExhdExuZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZlYXR1cmUuZ2V0TGF0TG5ncygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmVkaXRMYXllci5jbGVhckxheWVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0VmVydGV4TWFya2VycygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZFZlcnRleE1hcmtlcjogZnVuY3Rpb24gKGxhdGxuZywgbGF0bG5ncykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLnRvb2xzLm9wdGlvbnMudmVydGV4TWFya2VyQ2xhc3MobGF0bG5nLCBsYXRsbmdzLCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGRWZXJ0ZXhNYXJrZXJzOiBmdW5jdGlvbiAobGF0bG5ncykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRsbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRWZXJ0ZXhNYXJrZXIobGF0bG5nc1tpXSwgbGF0bG5ncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVmcmVzaFZlcnRleE1hcmtlcnM6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG4gICAgICAgICAgICBsYXRsbmdzID0gbGF0bG5ncyB8fCB0aGlzLmdldERlZmF1bHRMYXRMbmdzKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhdGxuZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsYXRsbmdzW2ldLl9fdmVydGV4LnVwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFkZE1pZGRsZU1hcmtlcjogZnVuY3Rpb24gKGxlZnQsIHJpZ2h0LCBsYXRsbmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMudG9vbHMub3B0aW9ucy5taWRkbGVNYXJrZXJDbGFzcyhsZWZ0LCByaWdodCwgbGF0bG5ncywgdGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25WZXJ0ZXhNYXJrZXJDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIEwuRWRpdGFibGUubWFrZUNhbmNlbGxhYmxlKGUpO1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6dmVydGV4OmNsaWNrJywgZSk7XG4gICAgICAgICAgICBpZiAoZS5fY2FuY2VsbGVkKSByZXR1cm47XG4gICAgICAgICAgICBpZiAodGhpcy50b29scy5kcmF3aW5nKCkgJiYgdGhpcy50b29scy5fZHJhd2luZ0VkaXRvciAhPT0gdGhpcykgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gZS52ZXJ0ZXguZ2V0SW5kZXgoKSwgY29tbWl0O1xuICAgICAgICAgICAgaWYgKGUub3JpZ2luYWxFdmVudC5jdHJsS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vblZlcnRleE1hcmtlckN0cmxDbGljayhlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5vcmlnaW5hbEV2ZW50LmFsdEtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25WZXJ0ZXhNYXJrZXJBbHRDbGljayhlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5vcmlnaW5hbEV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vblZlcnRleE1hcmtlclNoaWZ0Q2xpY2soZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUub3JpZ2luYWxFdmVudC5tZXRhS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vblZlcnRleE1hcmtlck1ldGFLZXlDbGljayhlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09IGUudmVydGV4LmdldExhc3RJbmRleCgpICYmIHRoaXMuX2RyYXdpbmcgPT09IEwuRWRpdGFibGUuRk9SV0FSRCkge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSB0aGlzLk1JTl9WRVJURVggLSAxKSBjb21taXQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gMCAmJiB0aGlzLl9kcmF3aW5nID09PSBMLkVkaXRhYmxlLkJBQ0tXQVJEICYmIHRoaXMuX2RyYXduTGF0TG5ncy5sZW5ndGggPj0gdGhpcy5NSU5fVkVSVEVYKSB7XG4gICAgICAgICAgICAgICAgY29tbWl0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09IDAgJiYgdGhpcy5fZHJhd2luZyA9PT0gTC5FZGl0YWJsZS5GT1JXQVJEICYmIHRoaXMuX2RyYXduTGF0TG5ncy5sZW5ndGggPj0gdGhpcy5NSU5fVkVSVEVYICYmIHRoaXMuQ0xPU0VEKSB7XG4gICAgICAgICAgICAgICAgY29tbWl0ID0gdHJ1ZTsgIC8vIEFsbG93IHRvIGNsb3NlIG9uIGZpcnN0IHBvaW50IGFsc28gZm9yIHBvbHlnb25zXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMub25WZXJ0ZXhSYXdNYXJrZXJDbGljayhlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDpjbGlja2VkJywgZSk7XG4gICAgICAgICAgICBpZiAoY29tbWl0KSB0aGlzLmNvbW1pdERyYXdpbmcoZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25WZXJ0ZXhSYXdNYXJrZXJDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDpyYXdjbGljaycsIGUpO1xuICAgICAgICAgICAgaWYgKGUuX2NhbmNlbGxlZCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCF0aGlzLnZlcnRleENhbkJlRGVsZXRlZChlLnZlcnRleCkpIHJldHVybjtcbiAgICAgICAgICAgIGUudmVydGV4LmRlbGV0ZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZlcnRleENhbkJlRGVsZXRlZDogZnVuY3Rpb24gKHZlcnRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHZlcnRleC5sYXRsbmdzLmxlbmd0aCA+IHRoaXMuTUlOX1ZFUlRFWDtcbiAgICAgICAgfSxcblxuICAgICAgICBvblZlcnRleERlbGV0ZWQ6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTp2ZXJ0ZXg6ZGVsZXRlZCcsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyQ3RybENsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6dmVydGV4OmN0cmxjbGljaycsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyU2hpZnRDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDpzaGlmdGNsaWNrJywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25WZXJ0ZXhNYXJrZXJNZXRhS2V5Q2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTp2ZXJ0ZXg6bWV0YWtleWNsaWNrJywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25WZXJ0ZXhNYXJrZXJBbHRDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDphbHRjbGljaycsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTp2ZXJ0ZXg6Y29udGV4dG1lbnUnLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvblZlcnRleE1hcmtlck1vdXNlRG93bjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDptb3VzZWRvd24nLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbk1pZGRsZU1hcmtlck1vdXNlRG93bjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOm1pZGRsZW1hcmtlcjptb3VzZWRvd24nLCBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvblZlcnRleE1hcmtlckRyYWc6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uTW92ZShlKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZlYXR1cmUuX2JvdW5kcykgdGhpcy5leHRlbmRCb3VuZHMoZSk7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTp2ZXJ0ZXg6ZHJhZycsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6dmVydGV4OmRyYWdzdGFydCcsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyRHJhZ0VuZDogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOnZlcnRleDpkcmFnZW5kJywgZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0RHJhd25MYXRMbmdzOiBmdW5jdGlvbiAobGF0bG5ncykge1xuICAgICAgICAgICAgdGhpcy5fZHJhd25MYXRMbmdzID0gbGF0bG5ncyB8fCB0aGlzLmdldERlZmF1bHRMYXRMbmdzKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnREcmF3aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYXduTGF0TG5ncykgdGhpcy5zZXREcmF3bkxhdExuZ3MoKTtcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUuc3RhcnREcmF3aW5nLmNhbGwodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnREcmF3aW5nRm9yd2FyZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zdGFydERyYXdpbmcoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYXR0YWNoRm9yd2FyZExpbmVHdWlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVuZERyYXdpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZGV0YWNoRm9yd2FyZExpbmVHdWlkZSgpO1xuICAgICAgICAgICAgdGhpcy50b29scy5kZXRhY2hCYWNrd2FyZExpbmVHdWlkZSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2RyYXduTGF0TG5ncyAmJiB0aGlzLl9kcmF3bkxhdExuZ3MubGVuZ3RoIDwgdGhpcy5NSU5fVkVSVEVYKSB0aGlzLmRlbGV0ZVNoYXBlKHRoaXMuX2RyYXduTGF0TG5ncyk7XG4gICAgICAgICAgICBMLkVkaXRhYmxlLkJhc2VFZGl0b3IucHJvdG90eXBlLmVuZERyYXdpbmcuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9kcmF3bkxhdExuZ3M7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkTGF0TG5nOiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZHJhd2luZyA9PT0gTC5FZGl0YWJsZS5GT1JXQVJEKSB0aGlzLl9kcmF3bkxhdExuZ3MucHVzaChsYXRsbmcpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLl9kcmF3bkxhdExuZ3MudW5zaGlmdChsYXRsbmcpO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLl9ib3VuZHMuZXh0ZW5kKGxhdGxuZyk7XG4gICAgICAgICAgICB0aGlzLmFkZFZlcnRleE1hcmtlcihsYXRsbmcsIHRoaXMuX2RyYXduTGF0TG5ncyk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSxcblxuICAgICAgICBuZXdQb2ludEZvcndhcmQ6IGZ1bmN0aW9uIChsYXRsbmcpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkTGF0TG5nKGxhdGxuZyk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmFuY2hvckZvcndhcmRMaW5lR3VpZGUobGF0bG5nKTtcbiAgICAgICAgICAgIGlmICghdGhpcy50b29scy5iYWNrd2FyZExpbmVHdWlkZS5fbGF0bG5nc1swXSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHMuYW5jaG9yQmFja3dhcmRMaW5lR3VpZGUobGF0bG5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBuZXdQb2ludEJhY2t3YXJkOiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgICAgICAgICB0aGlzLmFkZExhdExuZyhsYXRsbmcpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hbmNob3JCYWNrd2FyZExpbmVHdWlkZShsYXRsbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChsYXRsbmcpIHtcbiAgICAgICAgICAgIGlmICghbGF0bG5nKSByZXR1cm4gY29uc29sZS5lcnJvcignTC5FZGl0YWJsZS5QYXRoRWRpdG9yLnB1c2ggZXhwZWN0IGEgdmFpbGQgbGF0bG5nIGFzIHBhcmFtZXRlcicpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2RyYXdpbmcgPT09IEwuRWRpdGFibGUuRk9SV0FSRCkgdGhpcy5uZXdQb2ludEZvcndhcmQobGF0bG5nKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5uZXdQb2ludEJhY2t3YXJkKGxhdGxuZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlTGF0TG5nOiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgICAgICAgICBsYXRsbmcuX192ZXJ0ZXguZGVsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwb3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmF3bkxhdExuZ3MubGVuZ3RoIDw9IDEpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBsYXRsbmc7XG4gICAgICAgICAgICBpZiAodGhpcy5fZHJhd2luZyA9PT0gTC5FZGl0YWJsZS5GT1JXQVJEKSBsYXRsbmcgPSB0aGlzLl9kcmF3bkxhdExuZ3NbdGhpcy5fZHJhd25MYXRMbmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgZWxzZSBsYXRsbmcgPSB0aGlzLl9kcmF3bkxhdExuZ3NbMF07XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUxhdExuZyhsYXRsbmcpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2RyYXdpbmcgPT09IEwuRWRpdGFibGUuRk9SV0FSRCkgdGhpcy50b29scy5hbmNob3JGb3J3YXJkTGluZUd1aWRlKHRoaXMuX2RyYXduTGF0TG5nc1t0aGlzLl9kcmF3bkxhdExuZ3MubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnRvb2xzLmFuY2hvckZvcndhcmRMaW5lR3VpZGUodGhpcy5fZHJhd25MYXRMbmdzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBsYXRsbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcHJvY2Vzc0RyYXdpbmdDbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlLnZlcnRleCAmJiBlLnZlcnRleC5lZGl0b3IgPT09IHRoaXMpIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmF3aW5nID09PSBMLkVkaXRhYmxlLkZPUldBUkQpIHRoaXMubmV3UG9pbnRGb3J3YXJkKGUubGF0bG5nKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5uZXdQb2ludEJhY2t3YXJkKGUubGF0bG5nKTtcbiAgICAgICAgICAgIHRoaXMuZmlyZUFuZEZvcndhcmQoJ2VkaXRhYmxlOmRyYXdpbmc6Y2xpY2tlZCcsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhd2luZ01vdXNlTW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIEwuRWRpdGFibGUuQmFzZUVkaXRvci5wcm90b3R5cGUub25EcmF3aW5nTW91c2VNb3ZlLmNhbGwodGhpcywgZSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fZHJhd2luZykge1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHMubW92ZUZvcndhcmRMaW5lR3VpZGUoZS5sYXRsbmcpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHMubW92ZUJhY2t3YXJkTGluZUd1aWRlKGUubGF0bG5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUucmVkcmF3KCk7XG4gICAgICAgICAgICB0aGlzLm9uRWRpdGluZygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG5ld1NoYXBlOiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgICAgICAgICB2YXIgc2hhcGUgPSB0aGlzLmFkZE5ld0VtcHR5U2hhcGUoKTtcbiAgICAgICAgICAgIGlmICghc2hhcGUpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuc2V0RHJhd25MYXRMbmdzKHNoYXBlWzBdIHx8IHNoYXBlKTsgIC8vIFBvbHlnb24gb3IgcG9seWxpbmVcbiAgICAgICAgICAgIHRoaXMuc3RhcnREcmF3aW5nRm9yd2FyZCgpO1xuICAgICAgICAgICAgdGhpcy5maXJlQW5kRm9yd2FyZCgnZWRpdGFibGU6c2hhcGU6bmV3Jywge3NoYXBlOiBzaGFwZX0pO1xuICAgICAgICAgICAgaWYgKGxhdGxuZykgdGhpcy5uZXdQb2ludEZvcndhcmQobGF0bG5nKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWxldGVTaGFwZTogZnVuY3Rpb24gKHNoYXBlLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICB2YXIgZSA9IHtzaGFwZTogc2hhcGV9O1xuICAgICAgICAgICAgTC5FZGl0YWJsZS5tYWtlQ2FuY2VsbGFibGUoZSk7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpzaGFwZTpkZWxldGUnLCBlKTtcbiAgICAgICAgICAgIGlmIChlLl9jYW5jZWxsZWQpIHJldHVybjtcbiAgICAgICAgICAgIHNoYXBlID0gdGhpcy5fZGVsZXRlU2hhcGUoc2hhcGUsIGxhdGxuZ3MpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZW5zdXJlTm90RmxhdCkgdGhpcy5lbnN1cmVOb3RGbGF0KCk7ICAvLyBQb2x5Z29uLlxuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLnNldExhdExuZ3ModGhpcy5nZXRMYXRMbmdzKCkpOyAgLy8gRm9yY2UgYm91bmRzIHJlc2V0LlxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgICAgICB0aGlzLmZpcmVBbmRGb3J3YXJkKCdlZGl0YWJsZTpzaGFwZTpkZWxldGVkJywge3NoYXBlOiBzaGFwZX0pO1xuICAgICAgICAgICAgcmV0dXJuIHNoYXBlO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9kZWxldGVTaGFwZTogZnVuY3Rpb24gKHNoYXBlLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICBsYXRsbmdzID0gbGF0bG5ncyB8fCB0aGlzLmdldExhdExuZ3MoKTtcbiAgICAgICAgICAgIGlmICghbGF0bG5ncy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBpbnBsYWNlRGVsZXRlID0gZnVuY3Rpb24gKGxhdGxuZ3MsIHNoYXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGxlZCB3aGVuIGRlbGV0aW5nIGEgZmxhdCBsYXRsbmdzXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlID0gbGF0bG5ncy5zcGxpY2UoMCwgTnVtYmVyLk1BWF9WQUxVRSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaGFwZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNwbGljZURlbGV0ZSA9IGZ1bmN0aW9uIChsYXRsbmdzLCBzaGFwZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsZWQgd2hlbiByZW1vdmluZyBhIGxhdGxuZ3MgaW5zaWRlIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgICAgIGxhdGxuZ3Muc3BsaWNlKGxhdGxuZ3MuaW5kZXhPZihzaGFwZSksIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxhdGxuZ3MubGVuZ3RoKSBzZWxmLl9kZWxldGVTaGFwZShsYXRsbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNoYXBlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAobGF0bG5ncyA9PT0gc2hhcGUpIHJldHVybiBpbnBsYWNlRGVsZXRlKGxhdGxuZ3MsIHNoYXBlKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGF0bG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsYXRsbmdzW2ldID09PSBzaGFwZSkgcmV0dXJuIHNwbGljZURlbGV0ZShsYXRsbmdzLCBzaGFwZSk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobGF0bG5nc1tpXS5pbmRleE9mKHNoYXBlKSAhPT0gLTEpIHJldHVybiBzcGxpY2VEZWxldGUobGF0bG5nc1tpXSwgc2hhcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRlbGV0ZVNoYXBlQXQ6IGZ1bmN0aW9uIChsYXRsbmcpIHtcbiAgICAgICAgICAgIHZhciBzaGFwZSA9IHRoaXMuZmVhdHVyZS5zaGFwZUF0KGxhdGxuZyk7XG4gICAgICAgICAgICBpZiAoc2hhcGUpIHJldHVybiB0aGlzLmRlbGV0ZVNoYXBlKHNoYXBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhcHBlbmRTaGFwZTogZnVuY3Rpb24gKHNoYXBlKSB7XG4gICAgICAgICAgICB0aGlzLmluc2VydFNoYXBlKHNoYXBlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwcmVwZW5kU2hhcGU6IGZ1bmN0aW9uIChzaGFwZSkge1xuICAgICAgICAgICAgdGhpcy5pbnNlcnRTaGFwZShzaGFwZSwgMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5zZXJ0U2hhcGU6IGZ1bmN0aW9uIChzaGFwZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlTXVsdGkoKTtcbiAgICAgICAgICAgIHNoYXBlID0gdGhpcy5mb3JtYXRTaGFwZShzaGFwZSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGluZGV4ID09PSAndW5kZWZpbmVkJykgaW5kZXggPSB0aGlzLmZlYXR1cmUuX2xhdGxuZ3MubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLl9sYXRsbmdzLnNwbGljZShpbmRleCwgMCwgc2hhcGUpO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLnJlZHJhdygpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2VuYWJsZWQpIHRoaXMucmVzZXQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBleHRlbmRCb3VuZHM6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUuX2JvdW5kcy5leHRlbmQoZS52ZXJ0ZXgubGF0bG5nKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLkVkaXRhYmxlLlBvbHlsaW5lRWRpdG9yID0gTC5FZGl0YWJsZS5QYXRoRWRpdG9yLmV4dGVuZCh7XG5cbiAgICAgICAgc3RhcnREcmF3aW5nQmFja3dhcmQ6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG4gICAgICAgICAgICB0aGlzLl9kcmF3aW5nID0gTC5FZGl0YWJsZS5CQUNLV0FSRDtcbiAgICAgICAgICAgIHRoaXMuc3RhcnREcmF3aW5nKGxhdGxuZ3MpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hdHRhY2hCYWNrd2FyZExpbmVHdWlkZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbnRpbnVlQmFja3dhcmQ6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kcmF3aW5nKCkpIHJldHVybjtcbiAgICAgICAgICAgIGxhdGxuZ3MgPSBsYXRsbmdzIHx8IHRoaXMuZ2V0RGVmYXVsdExhdExuZ3MoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0RHJhd25MYXRMbmdzKGxhdGxuZ3MpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hbmNob3JCYWNrd2FyZExpbmVHdWlkZShsYXRsbmdzWzBdKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnREcmF3aW5nQmFja3dhcmQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb250aW51ZUZvcndhcmQ6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kcmF3aW5nKCkpIHJldHVybjtcbiAgICAgICAgICAgIGxhdGxuZ3MgPSBsYXRsbmdzIHx8IHRoaXMuZ2V0RGVmYXVsdExhdExuZ3MoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0RHJhd25MYXRMbmdzKGxhdGxuZ3MpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hbmNob3JGb3J3YXJkTGluZUd1aWRlKGxhdGxuZ3NbbGF0bG5ncy5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0RHJhd2luZ0ZvcndhcmQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZWZhdWx0TGF0TG5nczogZnVuY3Rpb24gKGxhdGxuZ3MpIHtcbiAgICAgICAgICAgIGxhdGxuZ3MgPSBsYXRsbmdzIHx8IHRoaXMuZmVhdHVyZS5fbGF0bG5ncztcbiAgICAgICAgICAgIGlmICghbGF0bG5ncy5sZW5ndGggfHwgbGF0bG5nc1swXSBpbnN0YW5jZW9mIEwuTGF0TG5nKSByZXR1cm4gbGF0bG5ncztcbiAgICAgICAgICAgIGVsc2UgcmV0dXJuIHRoaXMuZ2V0RGVmYXVsdExhdExuZ3MobGF0bG5nc1swXSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5zdXJlTXVsdGk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZlYXR1cmUuX2xhdGxuZ3MubGVuZ3RoICYmIEwuUG9seWxpbmUuX2ZsYXQodGhpcy5mZWF0dXJlLl9sYXRsbmdzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5fbGF0bG5ncyA9IFt0aGlzLmZlYXR1cmUuX2xhdGxuZ3NdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFkZE5ld0VtcHR5U2hhcGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZlYXR1cmUuX2xhdGxuZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNoYXBlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRTaGFwZShzaGFwZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoYXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mZWF0dXJlLl9sYXRsbmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGZvcm1hdFNoYXBlOiBmdW5jdGlvbiAoc2hhcGUpIHtcbiAgICAgICAgICAgIGlmIChMLlBvbHlsaW5lLl9mbGF0KHNoYXBlKSkgcmV0dXJuIHNoYXBlO1xuICAgICAgICAgICAgZWxzZSBpZiAoc2hhcGVbMF0pIHJldHVybiB0aGlzLmZvcm1hdFNoYXBlKHNoYXBlWzBdKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzcGxpdFNoYXBlOiBmdW5jdGlvbiAoc2hhcGUsIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIWluZGV4IHx8IGluZGV4ID49IHNoYXBlLmxlbmd0aCAtIDEpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlTXVsdGkoKTtcbiAgICAgICAgICAgIHZhciBzaGFwZUluZGV4ID0gdGhpcy5mZWF0dXJlLl9sYXRsbmdzLmluZGV4T2Yoc2hhcGUpO1xuICAgICAgICAgICAgaWYgKHNoYXBlSW5kZXggPT09IC0xKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgZmlyc3QgPSBzaGFwZS5zbGljZSgwLCBpbmRleCArIDEpLFxuICAgICAgICAgICAgICAgIHNlY29uZCA9IHNoYXBlLnNsaWNlKGluZGV4KTtcbiAgICAgICAgICAgIC8vIFdlIGRlYWwgd2l0aCByZWZlcmVuY2UsIHdlIGRvbid0IHdhbnQgdHdpY2UgdGhlIHNhbWUgbGF0bG5nIGFyb3VuZC5cbiAgICAgICAgICAgIHNlY29uZFswXSA9IEwubGF0TG5nKHNlY29uZFswXS5sYXQsIHNlY29uZFswXS5sbmcsIHNlY29uZFswXS5hbHQpO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLl9sYXRsbmdzLnNwbGljZShzaGFwZUluZGV4LCAxLCBmaXJzdCwgc2Vjb25kKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIEwuRWRpdGFibGUuUG9seWdvbkVkaXRvciA9IEwuRWRpdGFibGUuUGF0aEVkaXRvci5leHRlbmQoe1xuXG4gICAgICAgIENMT1NFRDogdHJ1ZSxcbiAgICAgICAgTUlOX1ZFUlRFWDogMyxcblxuICAgICAgICBzdGFydERyYXdpbmdGb3J3YXJkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBMLkVkaXRhYmxlLlBhdGhFZGl0b3IucHJvdG90eXBlLnN0YXJ0RHJhd2luZ0ZvcndhcmQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYXR0YWNoQmFja3dhcmRMaW5lR3VpZGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGROZXdFbXB0eUhvbGU6IGZ1bmN0aW9uIChsYXRsbmcpIHtcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlTm90RmxhdCgpO1xuICAgICAgICAgICAgdmFyIGxhdGxuZ3MgPSB0aGlzLmZlYXR1cmUuc2hhcGVBdChsYXRsbmcpO1xuICAgICAgICAgICAgaWYgKCFsYXRsbmdzKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgaG9sZXMgPSBbXTtcbiAgICAgICAgICAgIGxhdGxuZ3MucHVzaChob2xlcyk7XG4gICAgICAgICAgICByZXR1cm4gaG9sZXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbmV3SG9sZTogZnVuY3Rpb24gKGxhdGxuZykge1xuICAgICAgICAgICAgdmFyIGhvbGVzID0gdGhpcy5hZGROZXdFbXB0eUhvbGUobGF0bG5nKTtcbiAgICAgICAgICAgIGlmICghaG9sZXMpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuc2V0RHJhd25MYXRMbmdzKGhvbGVzKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnREcmF3aW5nRm9yd2FyZCgpO1xuICAgICAgICAgICAgaWYgKGxhdGxuZykgdGhpcy5uZXdQb2ludEZvcndhcmQobGF0bG5nKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGROZXdFbXB0eVNoYXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mZWF0dXJlLl9sYXRsbmdzLmxlbmd0aCAmJiB0aGlzLmZlYXR1cmUuX2xhdGxuZ3NbMF0ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNoYXBlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRTaGFwZShzaGFwZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNoYXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mZWF0dXJlLl9sYXRsbmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGVuc3VyZU11bHRpOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mZWF0dXJlLl9sYXRsbmdzLmxlbmd0aCAmJiBMLlBvbHlsaW5lLl9mbGF0KHRoaXMuZmVhdHVyZS5fbGF0bG5nc1swXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZlYXR1cmUuX2xhdGxuZ3MgPSBbdGhpcy5mZWF0dXJlLl9sYXRsbmdzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBlbnN1cmVOb3RGbGF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZmVhdHVyZS5fbGF0bG5ncy5sZW5ndGggfHwgTC5Qb2x5bGluZS5fZmxhdCh0aGlzLmZlYXR1cmUuX2xhdGxuZ3MpKSB0aGlzLmZlYXR1cmUuX2xhdGxuZ3MgPSBbdGhpcy5mZWF0dXJlLl9sYXRsbmdzXTtcbiAgICAgICAgfSxcblxuICAgICAgICB2ZXJ0ZXhDYW5CZURlbGV0ZWQ6IGZ1bmN0aW9uICh2ZXJ0ZXgpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmZlYXR1cmUucGFyZW50U2hhcGUodmVydGV4LmxhdGxuZ3MpLFxuICAgICAgICAgICAgICAgIGlkeCA9IEwuVXRpbC5pbmRleE9mKHBhcmVudCwgdmVydGV4LmxhdGxuZ3MpO1xuICAgICAgICAgICAgaWYgKGlkeCA+IDApIHJldHVybiB0cnVlOyAgLy8gSG9sZXMgY2FuIGJlIHRvdGFsbHkgZGVsZXRlZCB3aXRob3V0IHJlbW92aW5nIHRoZSBsYXllciBpdHNlbGYuXG4gICAgICAgICAgICByZXR1cm4gTC5FZGl0YWJsZS5QYXRoRWRpdG9yLnByb3RvdHlwZS52ZXJ0ZXhDYW5CZURlbGV0ZWQuY2FsbCh0aGlzLCB2ZXJ0ZXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldERlZmF1bHRMYXRMbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZmVhdHVyZS5fbGF0bG5ncy5sZW5ndGgpIHRoaXMuZmVhdHVyZS5fbGF0bG5ncy5wdXNoKFtdKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZlYXR1cmUuX2xhdGxuZ3NbMF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgZm9ybWF0U2hhcGU6IGZ1bmN0aW9uIChzaGFwZSkge1xuICAgICAgICAgICAgLy8gW1sxLCAyXSwgWzMsIDRdXSA9PiBtdXN0IGJlIG5lc3RlZFxuICAgICAgICAgICAgLy8gW10gPT4gbXVzdCBiZSBuZXN0ZWRcbiAgICAgICAgICAgIC8vIFtbXV0gPT4gaXMgYWxyZWFkeSBuZXN0ZWRcbiAgICAgICAgICAgIGlmIChMLlBvbHlsaW5lLl9mbGF0KHNoYXBlKSAmJiAoIXNoYXBlWzBdIHx8IHNoYXBlWzBdLmxlbmd0aCAhPT0gMCkpIHJldHVybiBbc2hhcGVdO1xuICAgICAgICAgICAgZWxzZSByZXR1cm4gc2hhcGU7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgTC5FZGl0YWJsZS5SZWN0YW5nbGVFZGl0b3IgPSBMLkVkaXRhYmxlLlBhdGhFZGl0b3IuZXh0ZW5kKHtcblxuICAgICAgICBDTE9TRUQ6IHRydWUsXG4gICAgICAgIE1JTl9WRVJURVg6IDQsXG5cbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgc2tpcE1pZGRsZU1hcmtlcnM6IHRydWVcbiAgICAgICAgfSxcblxuICAgICAgICBleHRlbmRCb3VuZHM6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBlLnZlcnRleC5nZXRJbmRleCgpLFxuICAgICAgICAgICAgICAgIG9wcG9zaXRlSW5kZXggPSAoaW5kZXggKyAyKSAlIDQsXG4gICAgICAgICAgICAgICAgb3Bwb3NpdGUgPSBlLnZlcnRleC5sYXRsbmdzW29wcG9zaXRlSW5kZXhdLFxuICAgICAgICAgICAgICAgIGJvdW5kcyA9IG5ldyBMLkxhdExuZ0JvdW5kcyhlLmxhdGxuZywgb3Bwb3NpdGUpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVCb3VuZHMoYm91bmRzKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaFZlcnRleE1hcmtlcnMoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYXdpbmdNb3VzZURvd246IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3QoKTtcbiAgICAgICAgICAgIHZhciBsYXRsbmdzID0gdGhpcy5nZXREZWZhdWx0TGF0TG5ncygpO1xuICAgICAgICAgICAgLy8gTC5Qb2x5Z29uLl9jb252ZXJ0TGF0TG5ncyByZW1vdmVzIGxhc3QgbGF0bG5nIGlmIGl0IGVxdWFscyBmaXJzdCBwb2ludCxcbiAgICAgICAgICAgIC8vIHdoaWNoIGlzIHRoZSBjYXNlIGhlcmUgYXMgYWxsIGxhdGxuZ3MgYXJlIFswLCAwXVxuICAgICAgICAgICAgaWYgKGxhdGxuZ3MubGVuZ3RoID09PSAzKSBsYXRsbmdzLnB1c2goZS5sYXRsbmcpO1xuICAgICAgICAgICAgdmFyIGJvdW5kcyA9IG5ldyBMLkxhdExuZ0JvdW5kcyhlLmxhdGxuZywgZS5sYXRsbmcpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVCb3VuZHMoYm91bmRzKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICAgICAgdGhpcy5jb21taXREcmF3aW5nKGUpO1xuICAgICAgICAgICAgLy8gU3RvcCBkcmFnZ2luZyBtYXAuXG4gICAgICAgICAgICB0aGlzLm1hcC5kcmFnZ2luZy5fZHJhZ2dhYmxlLl9vblVwKGUub3JpZ2luYWxFdmVudCk7XG4gICAgICAgICAgICAvLyBOb3cgdHJhbnNmZXIgb25nb2luZyBkcmFnIGFjdGlvbiB0byB0aGUgYm90dG9tIHJpZ2h0IGNvcm5lci5cbiAgICAgICAgICAgIC8vIFNob3VsZCB3ZSByZWZpbmUgd2hpY2ggY29ybmUgd2lsbCBoYW5kbGUgdGhlIGRyYWcgYWNjb3JkaW5nIHRvXG4gICAgICAgICAgICAvLyBkcmFnIGRpcmVjdGlvbj9cbiAgICAgICAgICAgIGxhdGxuZ3NbM10uX192ZXJ0ZXguZHJhZ2dpbmcuX2RyYWdnYWJsZS5fb25Eb3duKGUub3JpZ2luYWxFdmVudCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RGVmYXVsdExhdExuZ3M6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gbGF0bG5ncyB8fCB0aGlzLmZlYXR1cmUuX2xhdGxuZ3NbMF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQm91bmRzOiBmdW5jdGlvbiAoYm91bmRzKSB7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUuX2JvdW5kcyA9IGJvdW5kcztcbiAgICAgICAgICAgIHZhciBsYXRsbmdzID0gdGhpcy5nZXREZWZhdWx0TGF0TG5ncygpLFxuICAgICAgICAgICAgICAgIG5ld0xhdGxuZ3MgPSB0aGlzLmZlYXR1cmUuX2JvdW5kc1RvTGF0TG5ncyhib3VuZHMpO1xuICAgICAgICAgICAgLy8gS2VlcCByZWZlcmVuY2VzLlxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRsbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGF0bG5nc1tpXS51cGRhdGUobmV3TGF0bG5nc1tpXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIEwuRWRpdGFibGUuQ2lyY2xlRWRpdG9yID0gTC5FZGl0YWJsZS5QYXRoRWRpdG9yLmV4dGVuZCh7XG5cbiAgICAgICAgTUlOX1ZFUlRFWDogMixcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBza2lwTWlkZGxlTWFya2VyczogdHJ1ZVxuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uIChtYXAsIGZlYXR1cmUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIEwuRWRpdGFibGUuUGF0aEVkaXRvci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG1hcCwgZmVhdHVyZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLl9yZXNpemVMYXRMbmcgPSB0aGlzLmNvbXB1dGVSZXNpemVMYXRMbmcoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb21wdXRlUmVzaXplTGF0TG5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBXaGlsZSBjaXJjbGUgaXMgbm90IGFkZGVkIHRvIHRoZSBtYXAsIF9yYWRpdXMgaXMgbm90IHNldC5cbiAgICAgICAgICAgIHZhciBkZWx0YSA9ICh0aGlzLmZlYXR1cmUuX3JhZGl1cyB8fCB0aGlzLmZlYXR1cmUuX21SYWRpdXMpICogTWF0aC5jb3MoTWF0aC5QSSAvIDQpLFxuICAgICAgICAgICAgICAgIHBvaW50ID0gdGhpcy5tYXAucHJvamVjdCh0aGlzLmZlYXR1cmUuX2xhdGxuZyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tYXAudW5wcm9qZWN0KFtwb2ludC54ICsgZGVsdGEsIHBvaW50LnkgLSBkZWx0YV0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVJlc2l6ZUxhdExuZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzaXplTGF0TG5nLnVwZGF0ZSh0aGlzLmNvbXB1dGVSZXNpemVMYXRMbmcoKSk7XG4gICAgICAgICAgICB0aGlzLl9yZXNpemVMYXRMbmcuX192ZXJ0ZXgudXBkYXRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0TGF0TG5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFt0aGlzLmZlYXR1cmUuX2xhdGxuZywgdGhpcy5fcmVzaXplTGF0TG5nXTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZWZhdWx0TGF0TG5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TGF0TG5ncygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uVmVydGV4TWFya2VyRHJhZzogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChlLnZlcnRleC5nZXRJbmRleCgpID09PSAxKSB0aGlzLnJlc2l6ZShlKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy51cGRhdGVSZXNpemVMYXRMbmcoZSk7XG4gICAgICAgICAgICBMLkVkaXRhYmxlLlBhdGhFZGl0b3IucHJvdG90eXBlLm9uVmVydGV4TWFya2VyRHJhZy5jYWxsKHRoaXMsIGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2l6ZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciByYWRpdXMgPSB0aGlzLmZlYXR1cmUuX2xhdGxuZy5kaXN0YW5jZVRvKGUubGF0bG5nKVxuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLnNldFJhZGl1cyhyYWRpdXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhd2luZ01vdXNlRG93bjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc2l6ZUxhdExuZy51cGRhdGUoZS5sYXRsbmcpO1xuICAgICAgICAgICAgdGhpcy5mZWF0dXJlLl9sYXRsbmcudXBkYXRlKGUubGF0bG5nKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5jb21taXREcmF3aW5nKGUpO1xuICAgICAgICAgICAgLy8gU3RvcCBkcmFnZ2luZyBtYXAuXG4gICAgICAgICAgICB0aGlzLm1hcC5kcmFnZ2luZy5fZHJhZ2dhYmxlLl9vblVwKGUub3JpZ2luYWxFdmVudCk7XG4gICAgICAgICAgICAvLyBOb3cgdHJhbnNmZXIgb25nb2luZyBkcmFnIGFjdGlvbiB0byB0aGUgcmFkaXVzIGhhbmRsZXIuXG4gICAgICAgICAgICB0aGlzLl9yZXNpemVMYXRMbmcuX192ZXJ0ZXguZHJhZ2dpbmcuX2RyYWdnYWJsZS5fb25Eb3duKGUub3JpZ2luYWxFdmVudCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmF3aW5nTW91c2VNb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgTC5FZGl0YWJsZS5CYXNlRWRpdG9yLnByb3RvdHlwZS5vbkRyYXdpbmdNb3VzZU1vdmUuY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZS5fbGF0bG5nLnVwZGF0ZShlLmxhdGxuZyk7XG4gICAgICAgICAgICB0aGlzLmZlYXR1cmUuX2xhdGxuZy5fX3ZlcnRleC51cGRhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICB2YXIgRWRpdGFibGVNaXhpbiA9IHtcblxuICAgICAgICBjcmVhdGVFZGl0b3I6IGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgIG1hcCA9IG1hcCB8fCB0aGlzLl9tYXA7XG4gICAgICAgICAgICB2YXIgS2xhc3MgPSB0aGlzLm9wdGlvbnMuZWRpdG9yQ2xhc3MgfHwgdGhpcy5nZXRFZGl0b3JDbGFzcyhtYXApO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBLbGFzcyhtYXAsIHRoaXMsIHRoaXMub3B0aW9ucy5lZGl0T3B0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5hYmxlRWRpdDogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVkaXRvcikgdGhpcy5jcmVhdGVFZGl0b3IobWFwKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVkaXRvci5lbmFibGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBlZGl0RW5hYmxlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWRpdG9yICYmIHRoaXMuZWRpdG9yLl9lbmFibGVkO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRpc2FibGVFZGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVkaXRvci5kaXNhYmxlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHRvZ2dsZUVkaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmVkaXRFbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVFZGl0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlRWRpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9vbkVkaXRhYmxlQWRkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5lZGl0b3IpIHRoaXMuZW5hYmxlRWRpdCgpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgTC5Qb2x5bGluZS5pbmNsdWRlKEVkaXRhYmxlTWl4aW4pO1xuICAgIEwuUG9seWdvbi5pbmNsdWRlKEVkaXRhYmxlTWl4aW4pO1xuICAgIEwuTWFya2VyLmluY2x1ZGUoRWRpdGFibGVNaXhpbik7XG4gICAgTC5SZWN0YW5nbGUuaW5jbHVkZShFZGl0YWJsZU1peGluKTtcbiAgICBMLkNpcmNsZS5pbmNsdWRlKEVkaXRhYmxlTWl4aW4pO1xuXG4gICAgTC5Qb2x5bGluZS5pbmNsdWRlKHtcblxuICAgICAgICBnZXRFZGl0b3JDbGFzczogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXAgJiYgbWFwLm9wdGlvbnMucG9seWxpbmVFZGl0b3JDbGFzcykgPyBtYXAub3B0aW9ucy5wb2x5bGluZUVkaXRvckNsYXNzIDogTC5FZGl0YWJsZS5Qb2x5bGluZUVkaXRvcjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaGFwZUF0OiBmdW5jdGlvbiAobGF0bG5nLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICAvLyBXZSBjYW4gaGF2ZSB0aG9zZSBjYXNlczpcbiAgICAgICAgICAgIC8vIC0gbGF0bG5ncyBhcmUganVzdCBhIGZsYXQgYXJyYXkgb2YgbGF0bG5ncywgdXNlIHRoaXNcbiAgICAgICAgICAgIC8vIC0gbGF0bG5ncyBpcyBhbiBhcnJheSBvZiBhcnJheXMgb2YgbGF0bG5ncywgbG9vcCBvdmVyXG4gICAgICAgICAgICB2YXIgc2hhcGUgPSBudWxsO1xuICAgICAgICAgICAgbGF0bG5ncyA9IGxhdGxuZ3MgfHwgdGhpcy5fbGF0bG5ncztcbiAgICAgICAgICAgIGlmICghbGF0bG5ncy5sZW5ndGgpIHJldHVybiBzaGFwZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKEwuUG9seWxpbmUuX2ZsYXQobGF0bG5ncykgJiYgdGhpcy5pc0luTGF0TG5ncyhsYXRsbmcsIGxhdGxuZ3MpKSBzaGFwZSA9IGxhdGxuZ3M7XG4gICAgICAgICAgICBlbHNlIGZvciAodmFyIGkgPSAwOyBpIDwgbGF0bG5ncy5sZW5ndGg7IGkrKykgaWYgKHRoaXMuaXNJbkxhdExuZ3MobGF0bG5nLCBsYXRsbmdzW2ldKSkgcmV0dXJuIGxhdGxuZ3NbaV07XG4gICAgICAgICAgICByZXR1cm4gc2hhcGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNJbkxhdExuZ3M6IGZ1bmN0aW9uIChsLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICBpZiAoIWxhdGxuZ3MpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHZhciBpLCBrLCBsZW4sIHBhcnQgPSBbXSwgcCxcbiAgICAgICAgICAgICAgICB3ID0gdGhpcy5fY2xpY2tUb2xlcmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3Byb2plY3RMYXRsbmdzKGxhdGxuZ3MsIHBhcnQsIHRoaXMuX3B4Qm91bmRzKTtcbiAgICAgICAgICAgIHBhcnQgPSBwYXJ0WzBdO1xuICAgICAgICAgICAgcCA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQobCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fcHhCb3VuZHMuY29udGFpbnMocCkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICBmb3IgKGkgPSAxLCBsZW4gPSBwYXJ0Lmxlbmd0aCwgayA9IDA7IGkgPCBsZW47IGsgPSBpKyspIHtcblxuICAgICAgICAgICAgICAgIGlmIChMLkxpbmVVdGlsLnBvaW50VG9TZWdtZW50RGlzdGFuY2UocCwgcGFydFtrXSwgcGFydFtpXSkgPD0gdykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgTC5Qb2x5Z29uLmluY2x1ZGUoe1xuXG4gICAgICAgIGdldEVkaXRvckNsYXNzOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgICAgICAgICByZXR1cm4gKG1hcCAmJiBtYXAub3B0aW9ucy5wb2x5Z29uRWRpdG9yQ2xhc3MpID8gbWFwLm9wdGlvbnMucG9seWdvbkVkaXRvckNsYXNzIDogTC5FZGl0YWJsZS5Qb2x5Z29uRWRpdG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNoYXBlQXQ6IGZ1bmN0aW9uIChsYXRsbmcsIGxhdGxuZ3MpIHtcbiAgICAgICAgICAgIC8vIFdlIGNhbiBoYXZlIHRob3NlIGNhc2VzOlxuICAgICAgICAgICAgLy8gLSBsYXRsbmdzIGFyZSBqdXN0IGEgZmxhdCBhcnJheSBvZiBsYXRsbmdzLCB1c2UgdGhpc1xuICAgICAgICAgICAgLy8gLSBsYXRsbmdzIGlzIGFuIGFycmF5IG9mIGFycmF5cyBvZiBsYXRsbmdzLCB0aGlzIGlzIGEgc2ltcGxlIHBvbHlnb24gKG1heWJlIHdpdGggaG9sZXMpLCB1c2UgdGhlIGZpcnN0XG4gICAgICAgICAgICAvLyAtIGxhdGxuZ3MgaXMgYW4gYXJyYXkgb2YgYXJyYXlzIG9mIGFycmF5cywgdGhpcyBpcyBhIG11bHRpLCBsb29wIG92ZXJcbiAgICAgICAgICAgIHZhciBzaGFwZSA9IG51bGw7XG4gICAgICAgICAgICBsYXRsbmdzID0gbGF0bG5ncyB8fCB0aGlzLl9sYXRsbmdzO1xuICAgICAgICAgICAgaWYgKCFsYXRsbmdzLmxlbmd0aCkgcmV0dXJuIHNoYXBlO1xuICAgICAgICAgICAgZWxzZSBpZiAoTC5Qb2x5bGluZS5fZmxhdChsYXRsbmdzKSAmJiB0aGlzLmlzSW5MYXRMbmdzKGxhdGxuZywgbGF0bG5ncykpIHNoYXBlID0gbGF0bG5ncztcbiAgICAgICAgICAgIGVsc2UgaWYgKEwuUG9seWxpbmUuX2ZsYXQobGF0bG5nc1swXSkgJiYgdGhpcy5pc0luTGF0TG5ncyhsYXRsbmcsIGxhdGxuZ3NbMF0pKSBzaGFwZSA9IGxhdGxuZ3M7XG4gICAgICAgICAgICBlbHNlIGZvciAodmFyIGkgPSAwOyBpIDwgbGF0bG5ncy5sZW5ndGg7IGkrKykgaWYgKHRoaXMuaXNJbkxhdExuZ3MobGF0bG5nLCBsYXRsbmdzW2ldWzBdKSkgcmV0dXJuIGxhdGxuZ3NbaV07XG4gICAgICAgICAgICByZXR1cm4gc2hhcGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNJbkxhdExuZ3M6IGZ1bmN0aW9uIChsLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICB2YXIgaW5zaWRlID0gZmFsc2UsIGwxLCBsMiwgaiwgaywgbGVuMjtcblxuICAgICAgICAgICAgZm9yIChqID0gMCwgbGVuMiA9IGxhdGxuZ3MubGVuZ3RoLCBrID0gbGVuMiAtIDE7IGogPCBsZW4yOyBrID0gaisrKSB7XG4gICAgICAgICAgICAgICAgbDEgPSBsYXRsbmdzW2pdO1xuICAgICAgICAgICAgICAgIGwyID0gbGF0bG5nc1trXTtcblxuICAgICAgICAgICAgICAgIGlmICgoKGwxLmxhdCA+IGwubGF0KSAhPT0gKGwyLmxhdCA+IGwubGF0KSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChsLmxuZyA8IChsMi5sbmcgLSBsMS5sbmcpICogKGwubGF0IC0gbDEubGF0KSAvIChsMi5sYXQgLSBsMS5sYXQpICsgbDEubG5nKSkge1xuICAgICAgICAgICAgICAgICAgICBpbnNpZGUgPSAhaW5zaWRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGluc2lkZTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJlbnRTaGFwZTogZnVuY3Rpb24gKHNoYXBlLCBsYXRsbmdzKSB7XG4gICAgICAgICAgICBsYXRsbmdzID0gbGF0bG5ncyB8fCB0aGlzLl9sYXRsbmdzO1xuICAgICAgICAgICAgaWYgKCFsYXRsbmdzKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgaWR4ID0gTC5VdGlsLmluZGV4T2YobGF0bG5ncywgc2hhcGUpO1xuICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHJldHVybiBsYXRsbmdzO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRsbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gTC5VdGlsLmluZGV4T2YobGF0bG5nc1tpXSwgc2hhcGUpO1xuICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSByZXR1cm4gbGF0bG5nc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLk1hcmtlci5pbmNsdWRlKHtcblxuICAgICAgICBnZXRFZGl0b3JDbGFzczogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXAgJiYgbWFwLm9wdGlvbnMubWFya2VyRWRpdG9yQ2xhc3MpID8gbWFwLm9wdGlvbnMubWFya2VyRWRpdG9yQ2xhc3MgOiBMLkVkaXRhYmxlLk1hcmtlckVkaXRvcjtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLlJlY3RhbmdsZS5pbmNsdWRlKHtcblxuICAgICAgICBnZXRFZGl0b3JDbGFzczogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXAgJiYgbWFwLm9wdGlvbnMucmVjdGFuZ2xlRWRpdG9yQ2xhc3MpID8gbWFwLm9wdGlvbnMucmVjdGFuZ2xlRWRpdG9yQ2xhc3MgOiBMLkVkaXRhYmxlLlJlY3RhbmdsZUVkaXRvcjtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBMLkNpcmNsZS5pbmNsdWRlKHtcblxuICAgICAgICBnZXRFZGl0b3JDbGFzczogZnVuY3Rpb24gKG1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXAgJiYgbWFwLm9wdGlvbnMuY2lyY2xlRWRpdG9yQ2xhc3MpID8gbWFwLm9wdGlvbnMuY2lyY2xlRWRpdG9yQ2xhc3MgOiBMLkVkaXRhYmxlLkNpcmNsZUVkaXRvcjtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICB2YXIga2VlcEVkaXRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBNYWtlIHN1cmUgeW91IGNhbiByZW1vdmUvcmVhZGQgYW4gZWRpdGFibGUgbGF5ZXIuXG4gICAgICAgIHRoaXMub24oJ2FkZCcsIHRoaXMuX29uRWRpdGFibGVBZGQpO1xuICAgIH07XG4gICAgTC5NYXJrZXIuYWRkSW5pdEhvb2soa2VlcEVkaXRhYmxlKTtcbiAgICBMLlBvbHlsaW5lLmFkZEluaXRIb29rKGtlZXBFZGl0YWJsZSk7XG5cbiAgICBMLkxhdExuZy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGxhdGxuZykge1xuICAgICAgICB0aGlzLmxhdCA9IGxhdGxuZy5sYXQ7XG4gICAgICAgIHRoaXMubG5nID0gbGF0bG5nLmxuZztcbiAgICB9XG5cbn0sIHdpbmRvdykpO1xuIiwiLypcbiBMZWFmbGV0IDEuMC4wLWJldGEuMiAoNTVmZTQ2MiksIGEgSlMgbGlicmFyeSBmb3IgaW50ZXJhY3RpdmUgbWFwcy4gaHR0cDovL2xlYWZsZXRqcy5jb21cbiAoYykgMjAxMC0yMDE1IFZsYWRpbWlyIEFnYWZvbmtpbiwgKGMpIDIwMTAtMjAxMSBDbG91ZE1hZGVcbiovXG4oZnVuY3Rpb24gKHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCkge1xyXG52YXIgTCA9IHtcclxuXHR2ZXJzaW9uOiAnMS4wLjAtYmV0YS4yJ1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZXhwb3NlKCkge1xyXG5cdHZhciBvbGRMID0gd2luZG93Lkw7XHJcblxyXG5cdEwubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHdpbmRvdy5MID0gb2xkTDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblxyXG5cdHdpbmRvdy5MID0gTDtcclxufVxyXG5cclxuLy8gZGVmaW5lIExlYWZsZXQgZm9yIE5vZGUgbW9kdWxlIHBhdHRlcm4gbG9hZGVycywgaW5jbHVkaW5nIEJyb3dzZXJpZnlcclxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IEw7XHJcblxyXG4vLyBkZWZpbmUgTGVhZmxldCBhcyBhbiBBTUQgbW9kdWxlXHJcbn0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcblx0ZGVmaW5lKEwpO1xyXG59XHJcblxyXG4vLyBkZWZpbmUgTGVhZmxldCBhcyBhIGdsb2JhbCBMIHZhcmlhYmxlLCBzYXZpbmcgdGhlIG9yaWdpbmFsIEwgdG8gcmVzdG9yZSBsYXRlciBpZiBuZWVkZWRcclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0ZXhwb3NlKCk7XHJcbn1cclxuXG5cblxuLypcclxuICogTC5VdGlsIGNvbnRhaW5zIHZhcmlvdXMgdXRpbGl0eSBmdW5jdGlvbnMgdXNlZCB0aHJvdWdob3V0IExlYWZsZXQgY29kZS5cclxuICovXHJcblxyXG5MLlV0aWwgPSB7XHJcblx0Ly8gZXh0ZW5kIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgb2Ygb25lIG9yIG1vcmUgb3RoZXIgb2JqZWN0c1xyXG5cdGV4dGVuZDogZnVuY3Rpb24gKGRlc3QpIHtcclxuXHRcdHZhciBpLCBqLCBsZW4sIHNyYztcclxuXHJcblx0XHRmb3IgKGogPSAxLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcclxuXHRcdFx0c3JjID0gYXJndW1lbnRzW2pdO1xyXG5cdFx0XHRmb3IgKGkgaW4gc3JjKSB7XHJcblx0XHRcdFx0ZGVzdFtpXSA9IHNyY1tpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGRlc3Q7XHJcblx0fSxcclxuXHJcblx0Ly8gY3JlYXRlIGFuIG9iamVjdCBmcm9tIGEgZ2l2ZW4gcHJvdG90eXBlXHJcblx0Y3JlYXRlOiBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XHJcblx0XHRmdW5jdGlvbiBGKCkge31cclxuXHRcdHJldHVybiBmdW5jdGlvbiAocHJvdG8pIHtcclxuXHRcdFx0Ri5wcm90b3R5cGUgPSBwcm90bztcclxuXHRcdFx0cmV0dXJuIG5ldyBGKCk7XHJcblx0XHR9O1xyXG5cdH0pKCksXHJcblxyXG5cdC8vIGJpbmQgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCBhIGdpdmVuIGNvbnRleHRcclxuXHRiaW5kOiBmdW5jdGlvbiAoZm4sIG9iaikge1xyXG5cdFx0dmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xyXG5cclxuXHRcdGlmIChmbi5iaW5kKSB7XHJcblx0XHRcdHJldHVybiBmbi5iaW5kLmFwcGx5KGZuLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xyXG5cclxuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBmbi5hcHBseShvYmosIGFyZ3MubGVuZ3RoID8gYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSA6IGFyZ3VtZW50cyk7XHJcblx0XHR9O1xyXG5cdH0sXHJcblxyXG5cdC8vIHJldHVybiB1bmlxdWUgSUQgb2YgYW4gb2JqZWN0XHJcblx0c3RhbXA6IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdC8qZXNsaW50LWRpc2FibGUgKi9cclxuXHRcdG9iai5fbGVhZmxldF9pZCA9IG9iai5fbGVhZmxldF9pZCB8fCArK0wuVXRpbC5sYXN0SWQ7XHJcblx0XHRyZXR1cm4gb2JqLl9sZWFmbGV0X2lkO1xyXG5cdFx0Lyplc2xpbnQtZW5hYmxlICovXHJcblx0fSxcclxuXHJcblx0bGFzdElkOiAwLFxyXG5cclxuXHQvLyByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHdvbid0IGJlIGNhbGxlZCBtb3JlIG9mdGVuIHRoYW4gdGhlIGdpdmVuIGludGVydmFsXHJcblx0dGhyb3R0bGU6IGZ1bmN0aW9uIChmbiwgdGltZSwgY29udGV4dCkge1xyXG5cdFx0dmFyIGxvY2ssIGFyZ3MsIHdyYXBwZXJGbiwgbGF0ZXI7XHJcblxyXG5cdFx0bGF0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdC8vIHJlc2V0IGxvY2sgYW5kIGNhbGwgaWYgcXVldWVkXHJcblx0XHRcdGxvY2sgPSBmYWxzZTtcclxuXHRcdFx0aWYgKGFyZ3MpIHtcclxuXHRcdFx0XHR3cmFwcGVyRm4uYXBwbHkoY29udGV4dCwgYXJncyk7XHJcblx0XHRcdFx0YXJncyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHdyYXBwZXJGbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKGxvY2spIHtcclxuXHRcdFx0XHQvLyBjYWxsZWQgdG9vIHNvb24sIHF1ZXVlIHRvIGNhbGwgbGF0ZXJcclxuXHRcdFx0XHRhcmdzID0gYXJndW1lbnRzO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBjYWxsIGFuZCBsb2NrIHVudGlsIGxhdGVyXHJcblx0XHRcdFx0Zm4uYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGxhdGVyLCB0aW1lKTtcclxuXHRcdFx0XHRsb2NrID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gd3JhcHBlckZuO1xyXG5cdH0sXHJcblxyXG5cdC8vIHdyYXAgdGhlIGdpdmVuIG51bWJlciB0byBsaWUgd2l0aGluIGEgY2VydGFpbiByYW5nZSAodXNlZCBmb3Igd3JhcHBpbmcgbG9uZ2l0dWRlKVxyXG5cdHdyYXBOdW06IGZ1bmN0aW9uICh4LCByYW5nZSwgaW5jbHVkZU1heCkge1xyXG5cdFx0dmFyIG1heCA9IHJhbmdlWzFdLFxyXG5cdFx0ICAgIG1pbiA9IHJhbmdlWzBdLFxyXG5cdFx0ICAgIGQgPSBtYXggLSBtaW47XHJcblx0XHRyZXR1cm4geCA9PT0gbWF4ICYmIGluY2x1ZGVNYXggPyB4IDogKCh4IC0gbWluKSAlIGQgKyBkKSAlIGQgKyBtaW47XHJcblx0fSxcclxuXHJcblx0Ly8gZG8gbm90aGluZyAodXNlZCBhcyBhIG5vb3AgdGhyb3VnaG91dCB0aGUgY29kZSlcclxuXHRmYWxzZUZuOiBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfSxcclxuXHJcblx0Ly8gcm91bmQgYSBnaXZlbiBudW1iZXIgdG8gYSBnaXZlbiBwcmVjaXNpb25cclxuXHRmb3JtYXROdW06IGZ1bmN0aW9uIChudW0sIGRpZ2l0cykge1xyXG5cdFx0dmFyIHBvdyA9IE1hdGgucG93KDEwLCBkaWdpdHMgfHwgNSk7XHJcblx0XHRyZXR1cm4gTWF0aC5yb3VuZChudW0gKiBwb3cpIC8gcG93O1xyXG5cdH0sXHJcblxyXG5cdC8vIHRyaW0gd2hpdGVzcGFjZSBmcm9tIGJvdGggc2lkZXMgb2YgYSBzdHJpbmdcclxuXHR0cmltOiBmdW5jdGlvbiAoc3RyKSB7XHJcblx0XHRyZXR1cm4gc3RyLnRyaW0gPyBzdHIudHJpbSgpIDogc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcclxuXHR9LFxyXG5cclxuXHQvLyBzcGxpdCBhIHN0cmluZyBpbnRvIHdvcmRzXHJcblx0c3BsaXRXb3JkczogZnVuY3Rpb24gKHN0cikge1xyXG5cdFx0cmV0dXJuIEwuVXRpbC50cmltKHN0cikuc3BsaXQoL1xccysvKTtcclxuXHR9LFxyXG5cclxuXHQvLyBzZXQgb3B0aW9ucyB0byBhbiBvYmplY3QsIGluaGVyaXRpbmcgcGFyZW50J3Mgb3B0aW9ucyBhcyB3ZWxsXHJcblx0c2V0T3B0aW9uczogZnVuY3Rpb24gKG9iaiwgb3B0aW9ucykge1xyXG5cdFx0aWYgKCFvYmouaGFzT3duUHJvcGVydHkoJ29wdGlvbnMnKSkge1xyXG5cdFx0XHRvYmoub3B0aW9ucyA9IG9iai5vcHRpb25zID8gTC5VdGlsLmNyZWF0ZShvYmoub3B0aW9ucykgOiB7fTtcclxuXHRcdH1cclxuXHRcdGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xyXG5cdFx0XHRvYmoub3B0aW9uc1tpXSA9IG9wdGlvbnNbaV07XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gb2JqLm9wdGlvbnM7XHJcblx0fSxcclxuXHJcblx0Ly8gbWFrZSBhIFVSTCB3aXRoIEdFVCBwYXJhbWV0ZXJzIG91dCBvZiBhIHNldCBvZiBwcm9wZXJ0aWVzL3ZhbHVlc1xyXG5cdGdldFBhcmFtU3RyaW5nOiBmdW5jdGlvbiAob2JqLCBleGlzdGluZ1VybCwgdXBwZXJjYXNlKSB7XHJcblx0XHR2YXIgcGFyYW1zID0gW107XHJcblx0XHRmb3IgKHZhciBpIGluIG9iaikge1xyXG5cdFx0XHRwYXJhbXMucHVzaChlbmNvZGVVUklDb21wb25lbnQodXBwZXJjYXNlID8gaS50b1VwcGVyQ2FzZSgpIDogaSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW2ldKSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gKCghZXhpc3RpbmdVcmwgfHwgZXhpc3RpbmdVcmwuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJicpICsgcGFyYW1zLmpvaW4oJyYnKTtcclxuXHR9LFxyXG5cclxuXHQvLyBzdXBlci1zaW1wbGUgdGVtcGxhdGluZyBmYWNpbGl0eSwgdXNlZCBmb3IgVGlsZUxheWVyIFVSTHNcclxuXHR0ZW1wbGF0ZTogZnVuY3Rpb24gKHN0ciwgZGF0YSkge1xyXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlKEwuVXRpbC50ZW1wbGF0ZVJlLCBmdW5jdGlvbiAoc3RyLCBrZXkpIHtcclxuXHRcdFx0dmFyIHZhbHVlID0gZGF0YVtrZXldO1xyXG5cclxuXHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIHZhbHVlIHByb3ZpZGVkIGZvciB2YXJpYWJsZSAnICsgc3RyKTtcclxuXHJcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZShkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHR0ZW1wbGF0ZVJlOiAvXFx7ICooW1xcd19dKykgKlxcfS9nLFxyXG5cclxuXHRpc0FycmF5OiBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XScpO1xyXG5cdH0sXHJcblxyXG5cdGluZGV4T2Y6IGZ1bmN0aW9uIChhcnJheSwgZWwpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKGFycmF5W2ldID09PSBlbCkgeyByZXR1cm4gaTsgfVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIC0xO1xyXG5cdH0sXHJcblxyXG5cdC8vIG1pbmltYWwgaW1hZ2UgVVJJLCBzZXQgdG8gYW4gaW1hZ2Ugd2hlbiBkaXNwb3NpbmcgdG8gZmx1c2ggbWVtb3J5XHJcblx0ZW1wdHlJbWFnZVVybDogJ2RhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEFRQUJBQUQvQUN3QUFBQUFBUUFCQUFBQ0FEcz0nXHJcbn07XHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdC8vIGluc3BpcmVkIGJ5IGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXHJcblxyXG5cdGZ1bmN0aW9uIGdldFByZWZpeGVkKG5hbWUpIHtcclxuXHRcdHJldHVybiB3aW5kb3dbJ3dlYmtpdCcgKyBuYW1lXSB8fCB3aW5kb3dbJ21veicgKyBuYW1lXSB8fCB3aW5kb3dbJ21zJyArIG5hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIGxhc3RUaW1lID0gMDtcclxuXHJcblx0Ly8gZmFsbGJhY2sgZm9yIElFIDctOFxyXG5cdGZ1bmN0aW9uIHRpbWVvdXREZWZlcihmbikge1xyXG5cdFx0dmFyIHRpbWUgPSArbmV3IERhdGUoKSxcclxuXHRcdCAgICB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAodGltZSAtIGxhc3RUaW1lKSk7XHJcblxyXG5cdFx0bGFzdFRpbWUgPSB0aW1lICsgdGltZVRvQ2FsbDtcclxuXHRcdHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgdGltZVRvQ2FsbCk7XHJcblx0fVxyXG5cclxuXHR2YXIgcmVxdWVzdEZuID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBnZXRQcmVmaXhlZCgnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJykgfHwgdGltZW91dERlZmVyLFxyXG5cdCAgICBjYW5jZWxGbiA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCBnZXRQcmVmaXhlZCgnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnKSB8fFxyXG5cdCAgICAgICAgICAgICAgIGdldFByZWZpeGVkKCdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnKSB8fCBmdW5jdGlvbiAoaWQpIHsgd2luZG93LmNsZWFyVGltZW91dChpZCk7IH07XHJcblxyXG5cclxuXHRMLlV0aWwucmVxdWVzdEFuaW1GcmFtZSA9IGZ1bmN0aW9uIChmbiwgY29udGV4dCwgaW1tZWRpYXRlKSB7XHJcblx0XHRpZiAoaW1tZWRpYXRlICYmIHJlcXVlc3RGbiA9PT0gdGltZW91dERlZmVyKSB7XHJcblx0XHRcdGZuLmNhbGwoY29udGV4dCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gcmVxdWVzdEZuLmNhbGwod2luZG93LCBMLmJpbmQoZm4sIGNvbnRleHQpKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lID0gZnVuY3Rpb24gKGlkKSB7XHJcblx0XHRpZiAoaWQpIHtcclxuXHRcdFx0Y2FuY2VsRm4uY2FsbCh3aW5kb3csIGlkKTtcclxuXHRcdH1cclxuXHR9O1xyXG59KSgpO1xyXG5cclxuLy8gc2hvcnRjdXRzIGZvciBtb3N0IHVzZWQgdXRpbGl0eSBmdW5jdGlvbnNcclxuTC5leHRlbmQgPSBMLlV0aWwuZXh0ZW5kO1xyXG5MLmJpbmQgPSBMLlV0aWwuYmluZDtcclxuTC5zdGFtcCA9IEwuVXRpbC5zdGFtcDtcclxuTC5zZXRPcHRpb25zID0gTC5VdGlsLnNldE9wdGlvbnM7XHJcblxuXG5cbi8qXHJcbiAqIEwuQ2xhc3MgcG93ZXJzIHRoZSBPT1AgZmFjaWxpdGllcyBvZiB0aGUgbGlicmFyeS5cclxuICogVGhhbmtzIHRvIEpvaG4gUmVzaWcgYW5kIERlYW4gRWR3YXJkcyBmb3IgaW5zcGlyYXRpb24hXHJcbiAqL1xyXG5cclxuTC5DbGFzcyA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cclxuTC5DbGFzcy5leHRlbmQgPSBmdW5jdGlvbiAocHJvcHMpIHtcclxuXHJcblx0Ly8gZXh0ZW5kZWQgY2xhc3Mgd2l0aCB0aGUgbmV3IHByb3RvdHlwZVxyXG5cdHZhciBOZXdDbGFzcyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHQvLyBjYWxsIHRoZSBjb25zdHJ1Y3RvclxyXG5cdFx0aWYgKHRoaXMuaW5pdGlhbGl6ZSkge1xyXG5cdFx0XHR0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjYWxsIGFsbCBjb25zdHJ1Y3RvciBob29rc1xyXG5cdFx0dGhpcy5jYWxsSW5pdEhvb2tzKCk7XHJcblx0fTtcclxuXHJcblx0dmFyIHBhcmVudFByb3RvID0gTmV3Q2xhc3MuX19zdXBlcl9fID0gdGhpcy5wcm90b3R5cGU7XHJcblxyXG5cdHZhciBwcm90byA9IEwuVXRpbC5jcmVhdGUocGFyZW50UHJvdG8pO1xyXG5cdHByb3RvLmNvbnN0cnVjdG9yID0gTmV3Q2xhc3M7XHJcblxyXG5cdE5ld0NsYXNzLnByb3RvdHlwZSA9IHByb3RvO1xyXG5cclxuXHQvLyBpbmhlcml0IHBhcmVudCdzIHN0YXRpY3NcclxuXHRmb3IgKHZhciBpIGluIHRoaXMpIHtcclxuXHRcdGlmICh0aGlzLmhhc093blByb3BlcnR5KGkpICYmIGkgIT09ICdwcm90b3R5cGUnKSB7XHJcblx0XHRcdE5ld0NsYXNzW2ldID0gdGhpc1tpXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIG1peCBzdGF0aWMgcHJvcGVydGllcyBpbnRvIHRoZSBjbGFzc1xyXG5cdGlmIChwcm9wcy5zdGF0aWNzKSB7XHJcblx0XHRMLmV4dGVuZChOZXdDbGFzcywgcHJvcHMuc3RhdGljcyk7XHJcblx0XHRkZWxldGUgcHJvcHMuc3RhdGljcztcclxuXHR9XHJcblxyXG5cdC8vIG1peCBpbmNsdWRlcyBpbnRvIHRoZSBwcm90b3R5cGVcclxuXHRpZiAocHJvcHMuaW5jbHVkZXMpIHtcclxuXHRcdEwuVXRpbC5leHRlbmQuYXBwbHkobnVsbCwgW3Byb3RvXS5jb25jYXQocHJvcHMuaW5jbHVkZXMpKTtcclxuXHRcdGRlbGV0ZSBwcm9wcy5pbmNsdWRlcztcclxuXHR9XHJcblxyXG5cdC8vIG1lcmdlIG9wdGlvbnNcclxuXHRpZiAocHJvdG8ub3B0aW9ucykge1xyXG5cdFx0cHJvcHMub3B0aW9ucyA9IEwuVXRpbC5leHRlbmQoTC5VdGlsLmNyZWF0ZShwcm90by5vcHRpb25zKSwgcHJvcHMub3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHQvLyBtaXggZ2l2ZW4gcHJvcGVydGllcyBpbnRvIHRoZSBwcm90b3R5cGVcclxuXHRMLmV4dGVuZChwcm90bywgcHJvcHMpO1xyXG5cclxuXHRwcm90by5faW5pdEhvb2tzID0gW107XHJcblxyXG5cdC8vIGFkZCBtZXRob2QgZm9yIGNhbGxpbmcgYWxsIGhvb2tzXHJcblx0cHJvdG8uY2FsbEluaXRIb29rcyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAodGhpcy5faW5pdEhvb2tzQ2FsbGVkKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdGlmIChwYXJlbnRQcm90by5jYWxsSW5pdEhvb2tzKSB7XHJcblx0XHRcdHBhcmVudFByb3RvLmNhbGxJbml0SG9va3MuY2FsbCh0aGlzKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9pbml0SG9va3NDYWxsZWQgPSB0cnVlO1xyXG5cclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBwcm90by5faW5pdEhvb2tzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdHByb3RvLl9pbml0SG9va3NbaV0uY2FsbCh0aGlzKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gTmV3Q2xhc3M7XHJcbn07XHJcblxyXG5cclxuLy8gbWV0aG9kIGZvciBhZGRpbmcgcHJvcGVydGllcyB0byBwcm90b3R5cGVcclxuTC5DbGFzcy5pbmNsdWRlID0gZnVuY3Rpb24gKHByb3BzKSB7XHJcblx0TC5leHRlbmQodGhpcy5wcm90b3R5cGUsIHByb3BzKTtcclxufTtcclxuXHJcbi8vIG1lcmdlIG5ldyBkZWZhdWx0IG9wdGlvbnMgdG8gdGhlIENsYXNzXHJcbkwuQ2xhc3MubWVyZ2VPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuXHRMLmV4dGVuZCh0aGlzLnByb3RvdHlwZS5vcHRpb25zLCBvcHRpb25zKTtcclxufTtcclxuXHJcbi8vIGFkZCBhIGNvbnN0cnVjdG9yIGhvb2tcclxuTC5DbGFzcy5hZGRJbml0SG9vayA9IGZ1bmN0aW9uIChmbikgeyAvLyAoRnVuY3Rpb24pIHx8IChTdHJpbmcsIGFyZ3MuLi4pXHJcblx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xyXG5cclxuXHR2YXIgaW5pdCA9IHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyA/IGZuIDogZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpc1tmbl0uYXBwbHkodGhpcywgYXJncyk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5wcm90b3R5cGUuX2luaXRIb29rcyA9IHRoaXMucHJvdG90eXBlLl9pbml0SG9va3MgfHwgW107XHJcblx0dGhpcy5wcm90b3R5cGUuX2luaXRIb29rcy5wdXNoKGluaXQpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLkV2ZW50ZWQgaXMgYSBiYXNlIGNsYXNzIHRoYXQgTGVhZmxldCBjbGFzc2VzIGluaGVyaXQgZnJvbSB0byBoYW5kbGUgY3VzdG9tIGV2ZW50cy5cclxuICovXHJcblxyXG5MLkV2ZW50ZWQgPSBMLkNsYXNzLmV4dGVuZCh7XHJcblxyXG5cdG9uOiBmdW5jdGlvbiAodHlwZXMsIGZuLCBjb250ZXh0KSB7XHJcblxyXG5cdFx0Ly8gdHlwZXMgY2FuIGJlIGEgbWFwIG9mIHR5cGVzL2hhbmRsZXJzXHJcblx0XHRpZiAodHlwZW9mIHR5cGVzID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRmb3IgKHZhciB0eXBlIGluIHR5cGVzKSB7XHJcblx0XHRcdFx0Ly8gd2UgZG9uJ3QgcHJvY2VzcyBzcGFjZS1zZXBhcmF0ZWQgZXZlbnRzIGhlcmUgZm9yIHBlcmZvcm1hbmNlO1xyXG5cdFx0XHRcdC8vIGl0J3MgYSBob3QgcGF0aCBzaW5jZSBMYXllciB1c2VzIHRoZSBvbihvYmopIHN5bnRheFxyXG5cdFx0XHRcdHRoaXMuX29uKHR5cGUsIHR5cGVzW3R5cGVdLCBmbik7XHJcblx0XHRcdH1cclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyB0eXBlcyBjYW4gYmUgYSBzdHJpbmcgb2Ygc3BhY2Utc2VwYXJhdGVkIHdvcmRzXHJcblx0XHRcdHR5cGVzID0gTC5VdGlsLnNwbGl0V29yZHModHlwZXMpO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHR5cGVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5fb24odHlwZXNbaV0sIGZuLCBjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdG9mZjogZnVuY3Rpb24gKHR5cGVzLCBmbiwgY29udGV4dCkge1xyXG5cclxuXHRcdGlmICghdHlwZXMpIHtcclxuXHRcdFx0Ly8gY2xlYXIgYWxsIGxpc3RlbmVycyBpZiBjYWxsZWQgd2l0aG91dCBhcmd1bWVudHNcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50cztcclxuXHJcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiB0eXBlcyA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0Zm9yICh2YXIgdHlwZSBpbiB0eXBlcykge1xyXG5cdFx0XHRcdHRoaXMuX29mZih0eXBlLCB0eXBlc1t0eXBlXSwgZm4pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dHlwZXMgPSBMLlV0aWwuc3BsaXRXb3Jkcyh0eXBlcyk7XHJcblxyXG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gdHlwZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHR0aGlzLl9vZmYodHlwZXNbaV0sIGZuLCBjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdC8vIGF0dGFjaCBsaXN0ZW5lciAod2l0aG91dCBzeW50YWN0aWMgc3VnYXIgbm93KVxyXG5cdF9vbjogZnVuY3Rpb24gKHR5cGUsIGZuLCBjb250ZXh0KSB7XHJcblxyXG5cdFx0dmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fSxcclxuXHRcdCAgICBjb250ZXh0SWQgPSBjb250ZXh0ICYmIGNvbnRleHQgIT09IHRoaXMgJiYgTC5zdGFtcChjb250ZXh0KTtcclxuXHJcblx0XHRpZiAoY29udGV4dElkKSB7XHJcblx0XHRcdC8vIHN0b3JlIGxpc3RlbmVycyB3aXRoIGN1c3RvbSBjb250ZXh0IGluIGEgc2VwYXJhdGUgaGFzaCAoaWYgaXQgaGFzIGFuIGlkKTtcclxuXHRcdFx0Ly8gZ2l2ZXMgYSBtYWpvciBwZXJmb3JtYW5jZSBib29zdCB3aGVuIGZpcmluZyBhbmQgcmVtb3ZpbmcgZXZlbnRzIChlLmcuIG9uIG1hcCBvYmplY3QpXHJcblxyXG5cdFx0XHR2YXIgaW5kZXhLZXkgPSB0eXBlICsgJ19pZHgnLFxyXG5cdFx0XHQgICAgaW5kZXhMZW5LZXkgPSB0eXBlICsgJ19sZW4nLFxyXG5cdFx0XHQgICAgdHlwZUluZGV4ID0gZXZlbnRzW2luZGV4S2V5XSA9IGV2ZW50c1tpbmRleEtleV0gfHwge30sXHJcblx0XHRcdCAgICBpZCA9IEwuc3RhbXAoZm4pICsgJ18nICsgY29udGV4dElkO1xyXG5cclxuXHRcdFx0aWYgKCF0eXBlSW5kZXhbaWRdKSB7XHJcblx0XHRcdFx0dHlwZUluZGV4W2lkXSA9IHtmbjogZm4sIGN0eDogY29udGV4dH07XHJcblxyXG5cdFx0XHRcdC8vIGtlZXAgdHJhY2sgb2YgdGhlIG51bWJlciBvZiBrZXlzIGluIHRoZSBpbmRleCB0byBxdWlja2x5IGNoZWNrIGlmIGl0J3MgZW1wdHlcclxuXHRcdFx0XHRldmVudHNbaW5kZXhMZW5LZXldID0gKGV2ZW50c1tpbmRleExlbktleV0gfHwgMCkgKyAxO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gaW5kaXZpZHVhbCBsYXllcnMgbW9zdGx5IHVzZSBcInRoaXNcIiBmb3IgY29udGV4dCBhbmQgZG9uJ3QgZmlyZSBsaXN0ZW5lcnMgdG9vIG9mdGVuXHJcblx0XHRcdC8vIHNvIHNpbXBsZSBhcnJheSBtYWtlcyB0aGUgbWVtb3J5IGZvb3RwcmludCBiZXR0ZXIgd2hpbGUgbm90IGRlZ3JhZGluZyBwZXJmb3JtYW5jZVxyXG5cclxuXHRcdFx0ZXZlbnRzW3R5cGVdID0gZXZlbnRzW3R5cGVdIHx8IFtdO1xyXG5cdFx0XHRldmVudHNbdHlwZV0ucHVzaCh7Zm46IGZufSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X29mZjogZnVuY3Rpb24gKHR5cGUsIGZuLCBjb250ZXh0KSB7XHJcblx0XHR2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzLFxyXG5cdFx0ICAgIGluZGV4S2V5ID0gdHlwZSArICdfaWR4JyxcclxuXHRcdCAgICBpbmRleExlbktleSA9IHR5cGUgKyAnX2xlbic7XHJcblxyXG5cdFx0aWYgKCFldmVudHMpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0aWYgKCFmbikge1xyXG5cdFx0XHQvLyBjbGVhciBhbGwgbGlzdGVuZXJzIGZvciBhIHR5cGUgaWYgZnVuY3Rpb24gaXNuJ3Qgc3BlY2lmaWVkXHJcblx0XHRcdGRlbGV0ZSBldmVudHNbdHlwZV07XHJcblx0XHRcdGRlbGV0ZSBldmVudHNbaW5kZXhLZXldO1xyXG5cdFx0XHRkZWxldGUgZXZlbnRzW2luZGV4TGVuS2V5XTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjb250ZXh0SWQgPSBjb250ZXh0ICYmIGNvbnRleHQgIT09IHRoaXMgJiYgTC5zdGFtcChjb250ZXh0KSxcclxuXHRcdCAgICBsaXN0ZW5lcnMsIGksIGxlbiwgbGlzdGVuZXIsIGlkO1xyXG5cclxuXHRcdGlmIChjb250ZXh0SWQpIHtcclxuXHRcdFx0aWQgPSBMLnN0YW1wKGZuKSArICdfJyArIGNvbnRleHRJZDtcclxuXHRcdFx0bGlzdGVuZXJzID0gZXZlbnRzW2luZGV4S2V5XTtcclxuXHJcblx0XHRcdGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzW2lkXSkge1xyXG5cdFx0XHRcdGxpc3RlbmVyID0gbGlzdGVuZXJzW2lkXTtcclxuXHRcdFx0XHRkZWxldGUgbGlzdGVuZXJzW2lkXTtcclxuXHRcdFx0XHRldmVudHNbaW5kZXhMZW5LZXldLS07XHJcblx0XHRcdH1cclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRsaXN0ZW5lcnMgPSBldmVudHNbdHlwZV07XHJcblxyXG5cdFx0XHRpZiAobGlzdGVuZXJzKSB7XHJcblx0XHRcdFx0Zm9yIChpID0gMCwgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAobGlzdGVuZXJzW2ldLmZuID09PSBmbikge1xyXG5cdFx0XHRcdFx0XHRsaXN0ZW5lciA9IGxpc3RlbmVyc1tpXTtcclxuXHRcdFx0XHRcdFx0bGlzdGVuZXJzLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc2V0IHRoZSByZW1vdmVkIGxpc3RlbmVyIHRvIG5vb3Agc28gdGhhdCdzIG5vdCBjYWxsZWQgaWYgcmVtb3ZlIGhhcHBlbnMgaW4gZmlyZVxyXG5cdFx0aWYgKGxpc3RlbmVyKSB7XHJcblx0XHRcdGxpc3RlbmVyLmZuID0gTC5VdGlsLmZhbHNlRm47XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0ZmlyZTogZnVuY3Rpb24gKHR5cGUsIGRhdGEsIHByb3BhZ2F0ZSkge1xyXG5cdFx0aWYgKCF0aGlzLmxpc3RlbnModHlwZSwgcHJvcGFnYXRlKSkgeyByZXR1cm4gdGhpczsgfVxyXG5cclxuXHRcdHZhciBldmVudCA9IEwuVXRpbC5leHRlbmQoe30sIGRhdGEsIHt0eXBlOiB0eXBlLCB0YXJnZXQ6IHRoaXN9KSxcclxuXHRcdCAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XHJcblxyXG5cdFx0aWYgKGV2ZW50cykge1xyXG5cdFx0XHR2YXIgdHlwZUluZGV4ID0gZXZlbnRzW3R5cGUgKyAnX2lkeCddLFxyXG5cdFx0XHQgICAgaSwgbGVuLCBsaXN0ZW5lcnMsIGlkO1xyXG5cclxuXHRcdFx0aWYgKGV2ZW50c1t0eXBlXSkge1xyXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSBhZGRpbmcvcmVtb3ZpbmcgbGlzdGVuZXJzIGluc2lkZSBvdGhlciBsaXN0ZW5lcnMgd29uJ3QgY2F1c2UgaW5maW5pdGUgbG9vcFxyXG5cdFx0XHRcdGxpc3RlbmVycyA9IGV2ZW50c1t0eXBlXS5zbGljZSgpO1xyXG5cclxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHRcdGxpc3RlbmVyc1tpXS5mbi5jYWxsKHRoaXMsIGV2ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGZpcmUgZXZlbnQgZm9yIHRoZSBjb250ZXh0LWluZGV4ZWQgbGlzdGVuZXJzIGFzIHdlbGxcclxuXHRcdFx0Zm9yIChpZCBpbiB0eXBlSW5kZXgpIHtcclxuXHRcdFx0XHR0eXBlSW5kZXhbaWRdLmZuLmNhbGwodHlwZUluZGV4W2lkXS5jdHgsIGV2ZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwcm9wYWdhdGUpIHtcclxuXHRcdFx0Ly8gcHJvcGFnYXRlIHRoZSBldmVudCB0byBwYXJlbnRzIChzZXQgd2l0aCBhZGRFdmVudFBhcmVudClcclxuXHRcdFx0dGhpcy5fcHJvcGFnYXRlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGxpc3RlbnM6IGZ1bmN0aW9uICh0eXBlLCBwcm9wYWdhdGUpIHtcclxuXHRcdHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XHJcblxyXG5cdFx0aWYgKGV2ZW50cyAmJiAoZXZlbnRzW3R5cGVdIHx8IGV2ZW50c1t0eXBlICsgJ19sZW4nXSkpIHsgcmV0dXJuIHRydWU7IH1cclxuXHJcblx0XHRpZiAocHJvcGFnYXRlKSB7XHJcblx0XHRcdC8vIGFsc28gY2hlY2sgcGFyZW50cyBmb3IgbGlzdGVuZXJzIGlmIGV2ZW50IHByb3BhZ2F0ZXNcclxuXHRcdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5fZXZlbnRQYXJlbnRzKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuX2V2ZW50UGFyZW50c1tpZF0ubGlzdGVucyh0eXBlLCBwcm9wYWdhdGUpKSB7IHJldHVybiB0cnVlOyB9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9LFxyXG5cclxuXHRvbmNlOiBmdW5jdGlvbiAodHlwZXMsIGZuLCBjb250ZXh0KSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiB0eXBlcyA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0Zm9yICh2YXIgdHlwZSBpbiB0eXBlcykge1xyXG5cdFx0XHRcdHRoaXMub25jZSh0eXBlLCB0eXBlc1t0eXBlXSwgZm4pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBoYW5kbGVyID0gTC5iaW5kKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhpc1xyXG5cdFx0XHQgICAgLm9mZih0eXBlcywgZm4sIGNvbnRleHQpXHJcblx0XHRcdCAgICAub2ZmKHR5cGVzLCBoYW5kbGVyLCBjb250ZXh0KTtcclxuXHRcdH0sIHRoaXMpO1xyXG5cclxuXHRcdC8vIGFkZCBhIGxpc3RlbmVyIHRoYXQncyBleGVjdXRlZCBvbmNlIGFuZCByZW1vdmVkIGFmdGVyIHRoYXRcclxuXHRcdHJldHVybiB0aGlzXHJcblx0XHQgICAgLm9uKHR5cGVzLCBmbiwgY29udGV4dClcclxuXHRcdCAgICAub24odHlwZXMsIGhhbmRsZXIsIGNvbnRleHQpO1xyXG5cdH0sXHJcblxyXG5cdC8vIGFkZHMgYSBwYXJlbnQgdG8gcHJvcGFnYXRlIGV2ZW50cyB0byAod2hlbiB5b3UgZmlyZSB3aXRoIHRydWUgYXMgYSAzcmQgYXJndW1lbnQpXHJcblx0YWRkRXZlbnRQYXJlbnQ6IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdHRoaXMuX2V2ZW50UGFyZW50cyA9IHRoaXMuX2V2ZW50UGFyZW50cyB8fCB7fTtcclxuXHRcdHRoaXMuX2V2ZW50UGFyZW50c1tMLnN0YW1wKG9iaildID0gb2JqO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlRXZlbnRQYXJlbnQ6IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdGlmICh0aGlzLl9ldmVudFBhcmVudHMpIHtcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50UGFyZW50c1tMLnN0YW1wKG9iaildO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0X3Byb3BhZ2F0ZUV2ZW50OiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5fZXZlbnRQYXJlbnRzKSB7XHJcblx0XHRcdHRoaXMuX2V2ZW50UGFyZW50c1tpZF0uZmlyZShlLnR5cGUsIEwuZXh0ZW5kKHtsYXllcjogZS50YXJnZXR9LCBlKSwgdHJ1ZSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcbnZhciBwcm90byA9IEwuRXZlbnRlZC5wcm90b3R5cGU7XHJcblxyXG4vLyBhbGlhc2VzOyB3ZSBzaG91bGQgZGl0Y2ggdGhvc2UgZXZlbnR1YWxseVxyXG5wcm90by5hZGRFdmVudExpc3RlbmVyID0gcHJvdG8ub247XHJcbnByb3RvLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBwcm90by5jbGVhckFsbEV2ZW50TGlzdGVuZXJzID0gcHJvdG8ub2ZmO1xyXG5wcm90by5hZGRPbmVUaW1lRXZlbnRMaXN0ZW5lciA9IHByb3RvLm9uY2U7XHJcbnByb3RvLmZpcmVFdmVudCA9IHByb3RvLmZpcmU7XHJcbnByb3RvLmhhc0V2ZW50TGlzdGVuZXJzID0gcHJvdG8ubGlzdGVucztcclxuXHJcbkwuTWl4aW4gPSB7RXZlbnRzOiBwcm90b307XHJcblxuXG5cbi8qXHJcbiAqIEwuQnJvd3NlciBoYW5kbGVzIGRpZmZlcmVudCBicm93c2VyIGFuZCBmZWF0dXJlIGRldGVjdGlvbnMgZm9yIGludGVybmFsIExlYWZsZXQgdXNlLlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcblxyXG5cdHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxcclxuXHQgICAgZG9jID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxyXG5cclxuXHQgICAgaWUgPSAnQWN0aXZlWE9iamVjdCcgaW4gd2luZG93LFxyXG5cclxuXHQgICAgd2Via2l0ICAgID0gdWEuaW5kZXhPZignd2Via2l0JykgIT09IC0xLFxyXG5cdCAgICBwaGFudG9tanMgPSB1YS5pbmRleE9mKCdwaGFudG9tJykgIT09IC0xLFxyXG5cdCAgICBhbmRyb2lkMjMgPSB1YS5zZWFyY2goJ2FuZHJvaWQgWzIzXScpICE9PSAtMSxcclxuXHQgICAgY2hyb21lICAgID0gdWEuaW5kZXhPZignY2hyb21lJykgIT09IC0xLFxyXG5cdCAgICBnZWNrbyAgICAgPSB1YS5pbmRleE9mKCdnZWNrbycpICE9PSAtMSAgJiYgIXdlYmtpdCAmJiAhd2luZG93Lm9wZXJhICYmICFpZSxcclxuXHJcblx0ICAgIG1vYmlsZSA9IHR5cGVvZiBvcmllbnRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgfHwgdWEuaW5kZXhPZignbW9iaWxlJykgIT09IC0xLFxyXG5cdCAgICBtc1BvaW50ZXIgPSAhd2luZG93LlBvaW50ZXJFdmVudCAmJiB3aW5kb3cuTVNQb2ludGVyRXZlbnQsXHJcblx0ICAgIHBvaW50ZXIgPSAod2luZG93LlBvaW50ZXJFdmVudCAmJiBuYXZpZ2F0b3IucG9pbnRlckVuYWJsZWQpIHx8IG1zUG9pbnRlcixcclxuXHJcblx0ICAgIGllM2QgPSBpZSAmJiAoJ3RyYW5zaXRpb24nIGluIGRvYy5zdHlsZSksXHJcblx0ICAgIHdlYmtpdDNkID0gKCdXZWJLaXRDU1NNYXRyaXgnIGluIHdpbmRvdykgJiYgKCdtMTEnIGluIG5ldyB3aW5kb3cuV2ViS2l0Q1NTTWF0cml4KCkpICYmICFhbmRyb2lkMjMsXHJcblx0ICAgIGdlY2tvM2QgPSAnTW96UGVyc3BlY3RpdmUnIGluIGRvYy5zdHlsZSxcclxuXHQgICAgb3BlcmExMiA9ICdPVHJhbnNpdGlvbicgaW4gZG9jLnN0eWxlO1xyXG5cclxuXHR2YXIgdG91Y2ggPSAhd2luZG93LkxfTk9fVE9VQ0ggJiYgIXBoYW50b21qcyAmJiAocG9pbnRlciB8fCAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcclxuXHRcdFx0KHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2Ygd2luZG93LkRvY3VtZW50VG91Y2gpKTtcclxuXHJcblx0TC5Ccm93c2VyID0ge1xyXG5cdFx0aWU6IGllLFxyXG5cdFx0aWVsdDk6IGllICYmICFkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyLFxyXG5cdFx0d2Via2l0OiB3ZWJraXQsXHJcblx0XHRnZWNrbzogZ2Vja28sXHJcblx0XHRhbmRyb2lkOiB1YS5pbmRleE9mKCdhbmRyb2lkJykgIT09IC0xLFxyXG5cdFx0YW5kcm9pZDIzOiBhbmRyb2lkMjMsXHJcblx0XHRjaHJvbWU6IGNocm9tZSxcclxuXHRcdHNhZmFyaTogIWNocm9tZSAmJiB1YS5pbmRleE9mKCdzYWZhcmknKSAhPT0gLTEsXHJcblxyXG5cdFx0aWUzZDogaWUzZCxcclxuXHRcdHdlYmtpdDNkOiB3ZWJraXQzZCxcclxuXHRcdGdlY2tvM2Q6IGdlY2tvM2QsXHJcblx0XHRvcGVyYTEyOiBvcGVyYTEyLFxyXG5cdFx0YW55M2Q6ICF3aW5kb3cuTF9ESVNBQkxFXzNEICYmIChpZTNkIHx8IHdlYmtpdDNkIHx8IGdlY2tvM2QpICYmICFvcGVyYTEyICYmICFwaGFudG9tanMsXHJcblxyXG5cdFx0bW9iaWxlOiBtb2JpbGUsXHJcblx0XHRtb2JpbGVXZWJraXQ6IG1vYmlsZSAmJiB3ZWJraXQsXHJcblx0XHRtb2JpbGVXZWJraXQzZDogbW9iaWxlICYmIHdlYmtpdDNkLFxyXG5cdFx0bW9iaWxlT3BlcmE6IG1vYmlsZSAmJiB3aW5kb3cub3BlcmEsXHJcblx0XHRtb2JpbGVHZWNrbzogbW9iaWxlICYmIGdlY2tvLFxyXG5cclxuXHRcdHRvdWNoOiAhIXRvdWNoLFxyXG5cdFx0bXNQb2ludGVyOiAhIW1zUG9pbnRlcixcclxuXHRcdHBvaW50ZXI6ICEhcG9pbnRlcixcclxuXHJcblx0XHRyZXRpbmE6ICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAod2luZG93LnNjcmVlbi5kZXZpY2VYRFBJIC8gd2luZG93LnNjcmVlbi5sb2dpY2FsWERQSSkpID4gMVxyXG5cdH07XHJcblxyXG59KCkpO1xyXG5cblxuXG4vKlxyXG4gKiBMLlBvaW50IHJlcHJlc2VudHMgYSBwb2ludCB3aXRoIHggYW5kIHkgY29vcmRpbmF0ZXMuXHJcbiAqL1xyXG5cclxuTC5Qb2ludCA9IGZ1bmN0aW9uICh4LCB5LCByb3VuZCkge1xyXG5cdHRoaXMueCA9IChyb3VuZCA/IE1hdGgucm91bmQoeCkgOiB4KTtcclxuXHR0aGlzLnkgPSAocm91bmQgPyBNYXRoLnJvdW5kKHkpIDogeSk7XHJcbn07XHJcblxyXG5MLlBvaW50LnByb3RvdHlwZSA9IHtcclxuXHJcblx0Y2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgTC5Qb2ludCh0aGlzLngsIHRoaXMueSk7XHJcblx0fSxcclxuXHJcblx0Ly8gbm9uLWRlc3RydWN0aXZlLCByZXR1cm5zIGEgbmV3IHBvaW50XHJcblx0YWRkOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHJldHVybiB0aGlzLmNsb25lKCkuX2FkZChMLnBvaW50KHBvaW50KSk7XHJcblx0fSxcclxuXHJcblx0Ly8gZGVzdHJ1Y3RpdmUsIHVzZWQgZGlyZWN0bHkgZm9yIHBlcmZvcm1hbmNlIGluIHNpdHVhdGlvbnMgd2hlcmUgaXQncyBzYWZlIHRvIG1vZGlmeSBleGlzdGluZyBwb2ludFxyXG5cdF9hZGQ6IGZ1bmN0aW9uIChwb2ludCkge1xyXG5cdFx0dGhpcy54ICs9IHBvaW50Lng7XHJcblx0XHR0aGlzLnkgKz0gcG9pbnQueTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHN1YnRyYWN0OiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHJldHVybiB0aGlzLmNsb25lKCkuX3N1YnRyYWN0KEwucG9pbnQocG9pbnQpKTtcclxuXHR9LFxyXG5cclxuXHRfc3VidHJhY3Q6IGZ1bmN0aW9uIChwb2ludCkge1xyXG5cdFx0dGhpcy54IC09IHBvaW50Lng7XHJcblx0XHR0aGlzLnkgLT0gcG9pbnQueTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGRpdmlkZUJ5OiBmdW5jdGlvbiAobnVtKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSgpLl9kaXZpZGVCeShudW0pO1xyXG5cdH0sXHJcblxyXG5cdF9kaXZpZGVCeTogZnVuY3Rpb24gKG51bSkge1xyXG5cdFx0dGhpcy54IC89IG51bTtcclxuXHRcdHRoaXMueSAvPSBudW07XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRtdWx0aXBseUJ5OiBmdW5jdGlvbiAobnVtKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSgpLl9tdWx0aXBseUJ5KG51bSk7XHJcblx0fSxcclxuXHJcblx0X211bHRpcGx5Qnk6IGZ1bmN0aW9uIChudW0pIHtcclxuXHRcdHRoaXMueCAqPSBudW07XHJcblx0XHR0aGlzLnkgKj0gbnVtO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c2NhbGVCeTogZnVuY3Rpb24gKHBvaW50KSB7XHJcblx0XHRyZXR1cm4gbmV3IEwuUG9pbnQodGhpcy54ICogcG9pbnQueCwgdGhpcy55ICogcG9pbnQueSk7XHJcblx0fSxcclxuXHJcblx0dW5zY2FsZUJ5OiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHJldHVybiBuZXcgTC5Qb2ludCh0aGlzLnggLyBwb2ludC54LCB0aGlzLnkgLyBwb2ludC55KTtcclxuXHR9LFxyXG5cclxuXHRyb3VuZDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoKS5fcm91bmQoKTtcclxuXHR9LFxyXG5cclxuXHRfcm91bmQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcclxuXHRcdHRoaXMueSA9IE1hdGgucm91bmQodGhpcy55KTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGZsb29yOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSgpLl9mbG9vcigpO1xyXG5cdH0sXHJcblxyXG5cdF9mbG9vcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpcy54ID0gTWF0aC5mbG9vcih0aGlzLngpO1xyXG5cdFx0dGhpcy55ID0gTWF0aC5mbG9vcih0aGlzLnkpO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0Y2VpbDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoKS5fY2VpbCgpO1xyXG5cdH0sXHJcblxyXG5cdF9jZWlsOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR0aGlzLnggPSBNYXRoLmNlaWwodGhpcy54KTtcclxuXHRcdHRoaXMueSA9IE1hdGguY2VpbCh0aGlzLnkpO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0ZGlzdGFuY2VUbzogZnVuY3Rpb24gKHBvaW50KSB7XHJcblx0XHRwb2ludCA9IEwucG9pbnQocG9pbnQpO1xyXG5cclxuXHRcdHZhciB4ID0gcG9pbnQueCAtIHRoaXMueCxcclxuXHRcdCAgICB5ID0gcG9pbnQueSAtIHRoaXMueTtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkpO1xyXG5cdH0sXHJcblxyXG5cdGVxdWFsczogZnVuY3Rpb24gKHBvaW50KSB7XHJcblx0XHRwb2ludCA9IEwucG9pbnQocG9pbnQpO1xyXG5cclxuXHRcdHJldHVybiBwb2ludC54ID09PSB0aGlzLnggJiZcclxuXHRcdCAgICAgICBwb2ludC55ID09PSB0aGlzLnk7XHJcblx0fSxcclxuXHJcblx0Y29udGFpbnM6IGZ1bmN0aW9uIChwb2ludCkge1xyXG5cdFx0cG9pbnQgPSBMLnBvaW50KHBvaW50KTtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5hYnMocG9pbnQueCkgPD0gTWF0aC5hYnModGhpcy54KSAmJlxyXG5cdFx0ICAgICAgIE1hdGguYWJzKHBvaW50LnkpIDw9IE1hdGguYWJzKHRoaXMueSk7XHJcblx0fSxcclxuXHJcblx0dG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiAnUG9pbnQoJyArXHJcblx0XHQgICAgICAgIEwuVXRpbC5mb3JtYXROdW0odGhpcy54KSArICcsICcgK1xyXG5cdFx0ICAgICAgICBMLlV0aWwuZm9ybWF0TnVtKHRoaXMueSkgKyAnKSc7XHJcblx0fVxyXG59O1xyXG5cclxuTC5wb2ludCA9IGZ1bmN0aW9uICh4LCB5LCByb3VuZCkge1xyXG5cdGlmICh4IGluc3RhbmNlb2YgTC5Qb2ludCkge1xyXG5cdFx0cmV0dXJuIHg7XHJcblx0fVxyXG5cdGlmIChMLlV0aWwuaXNBcnJheSh4KSkge1xyXG5cdFx0cmV0dXJuIG5ldyBMLlBvaW50KHhbMF0sIHhbMV0pO1xyXG5cdH1cclxuXHRpZiAoeCA9PT0gdW5kZWZpbmVkIHx8IHggPT09IG51bGwpIHtcclxuXHRcdHJldHVybiB4O1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3IEwuUG9pbnQoeCwgeSwgcm91bmQpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLkJvdW5kcyByZXByZXNlbnRzIGEgcmVjdGFuZ3VsYXIgYXJlYSBvbiB0aGUgc2NyZWVuIGluIHBpeGVsIGNvb3JkaW5hdGVzLlxyXG4gKi9cclxuXHJcbkwuQm91bmRzID0gZnVuY3Rpb24gKGEsIGIpIHsgLy8gKFBvaW50LCBQb2ludCkgb3IgUG9pbnRbXVxyXG5cdGlmICghYSkgeyByZXR1cm47IH1cclxuXHJcblx0dmFyIHBvaW50cyA9IGIgPyBbYSwgYl0gOiBhO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMCwgbGVuID0gcG9pbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHR0aGlzLmV4dGVuZChwb2ludHNbaV0pO1xyXG5cdH1cclxufTtcclxuXHJcbkwuQm91bmRzLnByb3RvdHlwZSA9IHtcclxuXHQvLyBleHRlbmQgdGhlIGJvdW5kcyB0byBjb250YWluIHRoZSBnaXZlbiBwb2ludFxyXG5cdGV4dGVuZDogZnVuY3Rpb24gKHBvaW50KSB7IC8vIChQb2ludClcclxuXHRcdHBvaW50ID0gTC5wb2ludChwb2ludCk7XHJcblxyXG5cdFx0aWYgKCF0aGlzLm1pbiAmJiAhdGhpcy5tYXgpIHtcclxuXHRcdFx0dGhpcy5taW4gPSBwb2ludC5jbG9uZSgpO1xyXG5cdFx0XHR0aGlzLm1heCA9IHBvaW50LmNsb25lKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLm1pbi54ID0gTWF0aC5taW4ocG9pbnQueCwgdGhpcy5taW4ueCk7XHJcblx0XHRcdHRoaXMubWF4LnggPSBNYXRoLm1heChwb2ludC54LCB0aGlzLm1heC54KTtcclxuXHRcdFx0dGhpcy5taW4ueSA9IE1hdGgubWluKHBvaW50LnksIHRoaXMubWluLnkpO1xyXG5cdFx0XHR0aGlzLm1heC55ID0gTWF0aC5tYXgocG9pbnQueSwgdGhpcy5tYXgueSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRnZXRDZW50ZXI6IGZ1bmN0aW9uIChyb3VuZCkgeyAvLyAoQm9vbGVhbikgLT4gUG9pbnRcclxuXHRcdHJldHVybiBuZXcgTC5Qb2ludChcclxuXHRcdCAgICAgICAgKHRoaXMubWluLnggKyB0aGlzLm1heC54KSAvIDIsXHJcblx0XHQgICAgICAgICh0aGlzLm1pbi55ICsgdGhpcy5tYXgueSkgLyAyLCByb3VuZCk7XHJcblx0fSxcclxuXHJcblx0Z2V0Qm90dG9tTGVmdDogZnVuY3Rpb24gKCkgeyAvLyAtPiBQb2ludFxyXG5cdFx0cmV0dXJuIG5ldyBMLlBvaW50KHRoaXMubWluLngsIHRoaXMubWF4LnkpO1xyXG5cdH0sXHJcblxyXG5cdGdldFRvcFJpZ2h0OiBmdW5jdGlvbiAoKSB7IC8vIC0+IFBvaW50XHJcblx0XHRyZXR1cm4gbmV3IEwuUG9pbnQodGhpcy5tYXgueCwgdGhpcy5taW4ueSk7XHJcblx0fSxcclxuXHJcblx0Z2V0U2l6ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMubWF4LnN1YnRyYWN0KHRoaXMubWluKTtcclxuXHR9LFxyXG5cclxuXHRjb250YWluczogZnVuY3Rpb24gKG9iaikgeyAvLyAoQm91bmRzKSBvciAoUG9pbnQpIC0+IEJvb2xlYW5cclxuXHRcdHZhciBtaW4sIG1heDtcclxuXHJcblx0XHRpZiAodHlwZW9mIG9ialswXSA9PT0gJ251bWJlcicgfHwgb2JqIGluc3RhbmNlb2YgTC5Qb2ludCkge1xyXG5cdFx0XHRvYmogPSBMLnBvaW50KG9iaik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRvYmogPSBMLmJvdW5kcyhvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChvYmogaW5zdGFuY2VvZiBMLkJvdW5kcykge1xyXG5cdFx0XHRtaW4gPSBvYmoubWluO1xyXG5cdFx0XHRtYXggPSBvYmoubWF4O1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bWluID0gbWF4ID0gb2JqO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAobWluLnggPj0gdGhpcy5taW4ueCkgJiZcclxuXHRcdCAgICAgICAobWF4LnggPD0gdGhpcy5tYXgueCkgJiZcclxuXHRcdCAgICAgICAobWluLnkgPj0gdGhpcy5taW4ueSkgJiZcclxuXHRcdCAgICAgICAobWF4LnkgPD0gdGhpcy5tYXgueSk7XHJcblx0fSxcclxuXHJcblx0aW50ZXJzZWN0czogZnVuY3Rpb24gKGJvdW5kcykgeyAvLyAoQm91bmRzKSAtPiBCb29sZWFuXHJcblx0XHRib3VuZHMgPSBMLmJvdW5kcyhib3VuZHMpO1xyXG5cclxuXHRcdHZhciBtaW4gPSB0aGlzLm1pbixcclxuXHRcdCAgICBtYXggPSB0aGlzLm1heCxcclxuXHRcdCAgICBtaW4yID0gYm91bmRzLm1pbixcclxuXHRcdCAgICBtYXgyID0gYm91bmRzLm1heCxcclxuXHRcdCAgICB4SW50ZXJzZWN0cyA9IChtYXgyLnggPj0gbWluLngpICYmIChtaW4yLnggPD0gbWF4LngpLFxyXG5cdFx0ICAgIHlJbnRlcnNlY3RzID0gKG1heDIueSA+PSBtaW4ueSkgJiYgKG1pbjIueSA8PSBtYXgueSk7XHJcblxyXG5cdFx0cmV0dXJuIHhJbnRlcnNlY3RzICYmIHlJbnRlcnNlY3RzO1xyXG5cdH0sXHJcblxyXG5cdG92ZXJsYXBzOiBmdW5jdGlvbiAoYm91bmRzKSB7IC8vIChCb3VuZHMpIC0+IEJvb2xlYW5cclxuXHRcdGJvdW5kcyA9IEwuYm91bmRzKGJvdW5kcyk7XHJcblxyXG5cdFx0dmFyIG1pbiA9IHRoaXMubWluLFxyXG5cdFx0ICAgIG1heCA9IHRoaXMubWF4LFxyXG5cdFx0ICAgIG1pbjIgPSBib3VuZHMubWluLFxyXG5cdFx0ICAgIG1heDIgPSBib3VuZHMubWF4LFxyXG5cdFx0ICAgIHhPdmVybGFwcyA9IChtYXgyLnggPiBtaW4ueCkgJiYgKG1pbjIueCA8IG1heC54KSxcclxuXHRcdCAgICB5T3ZlcmxhcHMgPSAobWF4Mi55ID4gbWluLnkpICYmIChtaW4yLnkgPCBtYXgueSk7XHJcblxyXG5cdFx0cmV0dXJuIHhPdmVybGFwcyAmJiB5T3ZlcmxhcHM7XHJcblx0fSxcclxuXHJcblx0aXNWYWxpZDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuICEhKHRoaXMubWluICYmIHRoaXMubWF4KTtcclxuXHR9XHJcbn07XHJcblxyXG5MLmJvdW5kcyA9IGZ1bmN0aW9uIChhLCBiKSB7IC8vIChCb3VuZHMpIG9yIChQb2ludCwgUG9pbnQpIG9yIChQb2ludFtdKVxyXG5cdGlmICghYSB8fCBhIGluc3RhbmNlb2YgTC5Cb3VuZHMpIHtcclxuXHRcdHJldHVybiBhO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3IEwuQm91bmRzKGEsIGIpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLlRyYW5zZm9ybWF0aW9uIGlzIGFuIHV0aWxpdHkgY2xhc3MgdG8gcGVyZm9ybSBzaW1wbGUgcG9pbnQgdHJhbnNmb3JtYXRpb25zIHRocm91Z2ggYSAyZC1tYXRyaXguXHJcbiAqL1xyXG5cclxuTC5UcmFuc2Zvcm1hdGlvbiA9IGZ1bmN0aW9uIChhLCBiLCBjLCBkKSB7XHJcblx0dGhpcy5fYSA9IGE7XHJcblx0dGhpcy5fYiA9IGI7XHJcblx0dGhpcy5fYyA9IGM7XHJcblx0dGhpcy5fZCA9IGQ7XHJcbn07XHJcblxyXG5MLlRyYW5zZm9ybWF0aW9uLnByb3RvdHlwZSA9IHtcclxuXHR0cmFuc2Zvcm06IGZ1bmN0aW9uIChwb2ludCwgc2NhbGUpIHsgLy8gKFBvaW50LCBOdW1iZXIpIC0+IFBvaW50XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNmb3JtKHBvaW50LmNsb25lKCksIHNjYWxlKTtcclxuXHR9LFxyXG5cclxuXHQvLyBkZXN0cnVjdGl2ZSB0cmFuc2Zvcm0gKGZhc3RlcilcclxuXHRfdHJhbnNmb3JtOiBmdW5jdGlvbiAocG9pbnQsIHNjYWxlKSB7XHJcblx0XHRzY2FsZSA9IHNjYWxlIHx8IDE7XHJcblx0XHRwb2ludC54ID0gc2NhbGUgKiAodGhpcy5fYSAqIHBvaW50LnggKyB0aGlzLl9iKTtcclxuXHRcdHBvaW50LnkgPSBzY2FsZSAqICh0aGlzLl9jICogcG9pbnQueSArIHRoaXMuX2QpO1xyXG5cdFx0cmV0dXJuIHBvaW50O1xyXG5cdH0sXHJcblxyXG5cdHVudHJhbnNmb3JtOiBmdW5jdGlvbiAocG9pbnQsIHNjYWxlKSB7XHJcblx0XHRzY2FsZSA9IHNjYWxlIHx8IDE7XHJcblx0XHRyZXR1cm4gbmV3IEwuUG9pbnQoXHJcblx0XHQgICAgICAgIChwb2ludC54IC8gc2NhbGUgLSB0aGlzLl9iKSAvIHRoaXMuX2EsXHJcblx0XHQgICAgICAgIChwb2ludC55IC8gc2NhbGUgLSB0aGlzLl9kKSAvIHRoaXMuX2MpO1xyXG5cdH1cclxufTtcclxuXG5cblxuLypcclxuICogTC5Eb21VdGlsIGNvbnRhaW5zIHZhcmlvdXMgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIHdvcmtpbmcgd2l0aCBET00uXHJcbiAqL1xyXG5cclxuTC5Eb21VdGlsID0ge1xyXG5cdGdldDogZnVuY3Rpb24gKGlkKSB7XHJcblx0XHRyZXR1cm4gdHlwZW9mIGlkID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSA6IGlkO1xyXG5cdH0sXHJcblxyXG5cdGdldFN0eWxlOiBmdW5jdGlvbiAoZWwsIHN0eWxlKSB7XHJcblxyXG5cdFx0dmFyIHZhbHVlID0gZWwuc3R5bGVbc3R5bGVdIHx8IChlbC5jdXJyZW50U3R5bGUgJiYgZWwuY3VycmVudFN0eWxlW3N0eWxlXSk7XHJcblxyXG5cdFx0aWYgKCghdmFsdWUgfHwgdmFsdWUgPT09ICdhdXRvJykgJiYgZG9jdW1lbnQuZGVmYXVsdFZpZXcpIHtcclxuXHRcdFx0dmFyIGNzcyA9IGRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpO1xyXG5cdFx0XHR2YWx1ZSA9IGNzcyA/IGNzc1tzdHlsZV0gOiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB2YWx1ZSA9PT0gJ2F1dG8nID8gbnVsbCA6IHZhbHVlO1xyXG5cdH0sXHJcblxyXG5cdGNyZWF0ZTogZnVuY3Rpb24gKHRhZ05hbWUsIGNsYXNzTmFtZSwgY29udGFpbmVyKSB7XHJcblxyXG5cdFx0dmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcclxuXHRcdGVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcclxuXHJcblx0XHRpZiAoY29udGFpbmVyKSB7XHJcblx0XHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGVsO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZTogZnVuY3Rpb24gKGVsKSB7XHJcblx0XHR2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcclxuXHRcdGlmIChwYXJlbnQpIHtcclxuXHRcdFx0cGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRlbXB0eTogZnVuY3Rpb24gKGVsKSB7XHJcblx0XHR3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xyXG5cdFx0XHRlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHR0b0Zyb250OiBmdW5jdGlvbiAoZWwpIHtcclxuXHRcdGVsLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWwpO1xyXG5cdH0sXHJcblxyXG5cdHRvQmFjazogZnVuY3Rpb24gKGVsKSB7XHJcblx0XHR2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcclxuXHRcdHBhcmVudC5pbnNlcnRCZWZvcmUoZWwsIHBhcmVudC5maXJzdENoaWxkKTtcclxuXHR9LFxyXG5cclxuXHRoYXNDbGFzczogZnVuY3Rpb24gKGVsLCBuYW1lKSB7XHJcblx0XHRpZiAoZWwuY2xhc3NMaXN0ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0cmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhuYW1lKTtcclxuXHRcdH1cclxuXHRcdHZhciBjbGFzc05hbWUgPSBMLkRvbVV0aWwuZ2V0Q2xhc3MoZWwpO1xyXG5cdFx0cmV0dXJuIGNsYXNzTmFtZS5sZW5ndGggPiAwICYmIG5ldyBSZWdFeHAoJyhefFxcXFxzKScgKyBuYW1lICsgJyhcXFxcc3wkKScpLnRlc3QoY2xhc3NOYW1lKTtcclxuXHR9LFxyXG5cclxuXHRhZGRDbGFzczogZnVuY3Rpb24gKGVsLCBuYW1lKSB7XHJcblx0XHRpZiAoZWwuY2xhc3NMaXN0ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dmFyIGNsYXNzZXMgPSBMLlV0aWwuc3BsaXRXb3JkcyhuYW1lKTtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGNsYXNzZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHRlbC5jbGFzc0xpc3QuYWRkKGNsYXNzZXNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKCFMLkRvbVV0aWwuaGFzQ2xhc3MoZWwsIG5hbWUpKSB7XHJcblx0XHRcdHZhciBjbGFzc05hbWUgPSBMLkRvbVV0aWwuZ2V0Q2xhc3MoZWwpO1xyXG5cdFx0XHRMLkRvbVV0aWwuc2V0Q2xhc3MoZWwsIChjbGFzc05hbWUgPyBjbGFzc05hbWUgKyAnICcgOiAnJykgKyBuYW1lKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRyZW1vdmVDbGFzczogZnVuY3Rpb24gKGVsLCBuYW1lKSB7XHJcblx0XHRpZiAoZWwuY2xhc3NMaXN0ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0ZWwuY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdEwuRG9tVXRpbC5zZXRDbGFzcyhlbCwgTC5VdGlsLnRyaW0oKCcgJyArIEwuRG9tVXRpbC5nZXRDbGFzcyhlbCkgKyAnICcpLnJlcGxhY2UoJyAnICsgbmFtZSArICcgJywgJyAnKSkpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdHNldENsYXNzOiBmdW5jdGlvbiAoZWwsIG5hbWUpIHtcclxuXHRcdGlmIChlbC5jbGFzc05hbWUuYmFzZVZhbCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGVsLmNsYXNzTmFtZSA9IG5hbWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBpbiBjYXNlIG9mIFNWRyBlbGVtZW50XHJcblx0XHRcdGVsLmNsYXNzTmFtZS5iYXNlVmFsID0gbmFtZTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRnZXRDbGFzczogZnVuY3Rpb24gKGVsKSB7XHJcblx0XHRyZXR1cm4gZWwuY2xhc3NOYW1lLmJhc2VWYWwgPT09IHVuZGVmaW5lZCA/IGVsLmNsYXNzTmFtZSA6IGVsLmNsYXNzTmFtZS5iYXNlVmFsO1xyXG5cdH0sXHJcblxyXG5cdHNldE9wYWNpdHk6IGZ1bmN0aW9uIChlbCwgdmFsdWUpIHtcclxuXHJcblx0XHRpZiAoJ29wYWNpdHknIGluIGVsLnN0eWxlKSB7XHJcblx0XHRcdGVsLnN0eWxlLm9wYWNpdHkgPSB2YWx1ZTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKCdmaWx0ZXInIGluIGVsLnN0eWxlKSB7XHJcblx0XHRcdEwuRG9tVXRpbC5fc2V0T3BhY2l0eUlFKGVsLCB2YWx1ZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X3NldE9wYWNpdHlJRTogZnVuY3Rpb24gKGVsLCB2YWx1ZSkge1xyXG5cdFx0dmFyIGZpbHRlciA9IGZhbHNlLFxyXG5cdFx0ICAgIGZpbHRlck5hbWUgPSAnRFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuQWxwaGEnO1xyXG5cclxuXHRcdC8vIGZpbHRlcnMgY29sbGVjdGlvbiB0aHJvd3MgYW4gZXJyb3IgaWYgd2UgdHJ5IHRvIHJldHJpZXZlIGEgZmlsdGVyIHRoYXQgZG9lc24ndCBleGlzdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0ZmlsdGVyID0gZWwuZmlsdGVycy5pdGVtKGZpbHRlck5hbWUpO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHQvLyBkb24ndCBzZXQgb3BhY2l0eSB0byAxIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeSBzZXQgYW4gb3BhY2l0eSxcclxuXHRcdFx0Ly8gaXQgaXNuJ3QgbmVlZGVkIGFuZCBicmVha3MgdHJhbnNwYXJlbnQgcG5ncy5cclxuXHRcdFx0aWYgKHZhbHVlID09PSAxKSB7IHJldHVybjsgfVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhbHVlID0gTWF0aC5yb3VuZCh2YWx1ZSAqIDEwMCk7XHJcblxyXG5cdFx0aWYgKGZpbHRlcikge1xyXG5cdFx0XHRmaWx0ZXIuRW5hYmxlZCA9ICh2YWx1ZSAhPT0gMTAwKTtcclxuXHRcdFx0ZmlsdGVyLk9wYWNpdHkgPSB2YWx1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGVsLnN0eWxlLmZpbHRlciArPSAnIHByb2dpZDonICsgZmlsdGVyTmFtZSArICcob3BhY2l0eT0nICsgdmFsdWUgKyAnKSc7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0dGVzdFByb3A6IGZ1bmN0aW9uIChwcm9wcykge1xyXG5cclxuXHRcdHZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcclxuXHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChwcm9wc1tpXSBpbiBzdHlsZSkge1xyXG5cdFx0XHRcdHJldHVybiBwcm9wc1tpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH0sXHJcblxyXG5cdHNldFRyYW5zZm9ybTogZnVuY3Rpb24gKGVsLCBvZmZzZXQsIHNjYWxlKSB7XHJcblx0XHR2YXIgcG9zID0gb2Zmc2V0IHx8IG5ldyBMLlBvaW50KDAsIDApO1xyXG5cclxuXHRcdGVsLnN0eWxlW0wuRG9tVXRpbC5UUkFOU0ZPUk1dID1cclxuXHRcdFx0KEwuQnJvd3Nlci5pZTNkID9cclxuXHRcdFx0XHQndHJhbnNsYXRlKCcgKyBwb3MueCArICdweCwnICsgcG9zLnkgKyAncHgpJyA6XHJcblx0XHRcdFx0J3RyYW5zbGF0ZTNkKCcgKyBwb3MueCArICdweCwnICsgcG9zLnkgKyAncHgsMCknKSArXHJcblx0XHRcdChzY2FsZSA/ICcgc2NhbGUoJyArIHNjYWxlICsgJyknIDogJycpO1xyXG5cdH0sXHJcblxyXG5cdHNldFBvc2l0aW9uOiBmdW5jdGlvbiAoZWwsIHBvaW50KSB7IC8vIChIVE1MRWxlbWVudCwgUG9pbnRbLCBCb29sZWFuXSlcclxuXHJcblx0XHQvKmVzbGludC1kaXNhYmxlICovXHJcblx0XHRlbC5fbGVhZmxldF9wb3MgPSBwb2ludDtcclxuXHRcdC8qZXNsaW50LWVuYWJsZSAqL1xyXG5cclxuXHRcdGlmIChMLkJyb3dzZXIuYW55M2QpIHtcclxuXHRcdFx0TC5Eb21VdGlsLnNldFRyYW5zZm9ybShlbCwgcG9pbnQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZWwuc3R5bGUubGVmdCA9IHBvaW50LnggKyAncHgnO1xyXG5cdFx0XHRlbC5zdHlsZS50b3AgPSBwb2ludC55ICsgJ3B4JztcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRnZXRQb3NpdGlvbjogZnVuY3Rpb24gKGVsKSB7XHJcblx0XHQvLyB0aGlzIG1ldGhvZCBpcyBvbmx5IHVzZWQgZm9yIGVsZW1lbnRzIHByZXZpb3VzbHkgcG9zaXRpb25lZCB1c2luZyBzZXRQb3NpdGlvbixcclxuXHRcdC8vIHNvIGl0J3Mgc2FmZSB0byBjYWNoZSB0aGUgcG9zaXRpb24gZm9yIHBlcmZvcm1hbmNlXHJcblxyXG5cdFx0cmV0dXJuIGVsLl9sZWFmbGV0X3BvcztcclxuXHR9XHJcbn07XHJcblxyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHQvLyBwcmVmaXggc3R5bGUgcHJvcGVydHkgbmFtZXNcclxuXHJcblx0TC5Eb21VdGlsLlRSQU5TRk9STSA9IEwuRG9tVXRpbC50ZXN0UHJvcChcclxuXHRcdFx0Wyd0cmFuc2Zvcm0nLCAnV2Via2l0VHJhbnNmb3JtJywgJ09UcmFuc2Zvcm0nLCAnTW96VHJhbnNmb3JtJywgJ21zVHJhbnNmb3JtJ10pO1xyXG5cclxuXHJcblx0Ly8gd2Via2l0VHJhbnNpdGlvbiBjb21lcyBmaXJzdCBiZWNhdXNlIHNvbWUgYnJvd3NlciB2ZXJzaW9ucyB0aGF0IGRyb3AgdmVuZG9yIHByZWZpeCBkb24ndCBkb1xyXG5cdC8vIHRoZSBzYW1lIGZvciB0aGUgdHJhbnNpdGlvbmVuZCBldmVudCwgaW4gcGFydGljdWxhciB0aGUgQW5kcm9pZCA0LjEgc3RvY2sgYnJvd3NlclxyXG5cclxuXHR2YXIgdHJhbnNpdGlvbiA9IEwuRG9tVXRpbC5UUkFOU0lUSU9OID0gTC5Eb21VdGlsLnRlc3RQcm9wKFxyXG5cdFx0XHRbJ3dlYmtpdFRyYW5zaXRpb24nLCAndHJhbnNpdGlvbicsICdPVHJhbnNpdGlvbicsICdNb3pUcmFuc2l0aW9uJywgJ21zVHJhbnNpdGlvbiddKTtcclxuXHJcblx0TC5Eb21VdGlsLlRSQU5TSVRJT05fRU5EID1cclxuXHRcdFx0dHJhbnNpdGlvbiA9PT0gJ3dlYmtpdFRyYW5zaXRpb24nIHx8IHRyYW5zaXRpb24gPT09ICdPVHJhbnNpdGlvbicgPyB0cmFuc2l0aW9uICsgJ0VuZCcgOiAndHJhbnNpdGlvbmVuZCc7XHJcblxyXG5cclxuXHRpZiAoJ29uc2VsZWN0c3RhcnQnIGluIGRvY3VtZW50KSB7XHJcblx0XHRMLkRvbVV0aWwuZGlzYWJsZVRleHRTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdEwuRG9tRXZlbnQub24od2luZG93LCAnc2VsZWN0c3RhcnQnLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KTtcclxuXHRcdH07XHJcblx0XHRMLkRvbVV0aWwuZW5hYmxlVGV4dFNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0TC5Eb21FdmVudC5vZmYod2luZG93LCAnc2VsZWN0c3RhcnQnLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KTtcclxuXHRcdH07XHJcblxyXG5cdH0gZWxzZSB7XHJcblx0XHR2YXIgdXNlclNlbGVjdFByb3BlcnR5ID0gTC5Eb21VdGlsLnRlc3RQcm9wKFxyXG5cdFx0XHRbJ3VzZXJTZWxlY3QnLCAnV2Via2l0VXNlclNlbGVjdCcsICdPVXNlclNlbGVjdCcsICdNb3pVc2VyU2VsZWN0JywgJ21zVXNlclNlbGVjdCddKTtcclxuXHJcblx0XHRMLkRvbVV0aWwuZGlzYWJsZVRleHRTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh1c2VyU2VsZWN0UHJvcGVydHkpIHtcclxuXHRcdFx0XHR2YXIgc3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XHJcblx0XHRcdFx0dGhpcy5fdXNlclNlbGVjdCA9IHN0eWxlW3VzZXJTZWxlY3RQcm9wZXJ0eV07XHJcblx0XHRcdFx0c3R5bGVbdXNlclNlbGVjdFByb3BlcnR5XSA9ICdub25lJztcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRcdEwuRG9tVXRpbC5lbmFibGVUZXh0U2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAodXNlclNlbGVjdFByb3BlcnR5KSB7XHJcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlW3VzZXJTZWxlY3RQcm9wZXJ0eV0gPSB0aGlzLl91c2VyU2VsZWN0O1xyXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl91c2VyU2VsZWN0O1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0TC5Eb21VdGlsLmRpc2FibGVJbWFnZURyYWcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbUV2ZW50Lm9uKHdpbmRvdywgJ2RyYWdzdGFydCcsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpO1xyXG5cdH07XHJcblx0TC5Eb21VdGlsLmVuYWJsZUltYWdlRHJhZyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdEwuRG9tRXZlbnQub2ZmKHdpbmRvdywgJ2RyYWdzdGFydCcsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpO1xyXG5cdH07XHJcblxyXG5cdEwuRG9tVXRpbC5wcmV2ZW50T3V0bGluZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcblx0XHR3aGlsZSAoZWxlbWVudC50YWJJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcclxuXHRcdH1cclxuXHRcdGlmICghZWxlbWVudCB8fCAhZWxlbWVudC5zdHlsZSkgeyByZXR1cm47IH1cclxuXHRcdEwuRG9tVXRpbC5yZXN0b3JlT3V0bGluZSgpO1xyXG5cdFx0dGhpcy5fb3V0bGluZUVsZW1lbnQgPSBlbGVtZW50O1xyXG5cdFx0dGhpcy5fb3V0bGluZVN0eWxlID0gZWxlbWVudC5zdHlsZS5vdXRsaW5lO1xyXG5cdFx0ZWxlbWVudC5zdHlsZS5vdXRsaW5lID0gJ25vbmUnO1xyXG5cdFx0TC5Eb21FdmVudC5vbih3aW5kb3csICdrZXlkb3duJywgTC5Eb21VdGlsLnJlc3RvcmVPdXRsaW5lLCB0aGlzKTtcclxuXHR9O1xyXG5cdEwuRG9tVXRpbC5yZXN0b3JlT3V0bGluZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICghdGhpcy5fb3V0bGluZUVsZW1lbnQpIHsgcmV0dXJuOyB9XHJcblx0XHR0aGlzLl9vdXRsaW5lRWxlbWVudC5zdHlsZS5vdXRsaW5lID0gdGhpcy5fb3V0bGluZVN0eWxlO1xyXG5cdFx0ZGVsZXRlIHRoaXMuX291dGxpbmVFbGVtZW50O1xyXG5cdFx0ZGVsZXRlIHRoaXMuX291dGxpbmVTdHlsZTtcclxuXHRcdEwuRG9tRXZlbnQub2ZmKHdpbmRvdywgJ2tleWRvd24nLCBMLkRvbVV0aWwucmVzdG9yZU91dGxpbmUsIHRoaXMpO1xyXG5cdH07XHJcbn0pKCk7XHJcblxuXG5cbi8qXHJcbiAqIEwuTGF0TG5nIHJlcHJlc2VudHMgYSBnZW9ncmFwaGljYWwgcG9pbnQgd2l0aCBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIGNvb3JkaW5hdGVzLlxyXG4gKi9cclxuXHJcbkwuTGF0TG5nID0gZnVuY3Rpb24gKGxhdCwgbG5nLCBhbHQpIHtcclxuXHRpZiAoaXNOYU4obGF0KSB8fCBpc05hTihsbmcpKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgTGF0TG5nIG9iamVjdDogKCcgKyBsYXQgKyAnLCAnICsgbG5nICsgJyknKTtcclxuXHR9XHJcblxyXG5cdHRoaXMubGF0ID0gK2xhdDtcclxuXHR0aGlzLmxuZyA9ICtsbmc7XHJcblxyXG5cdGlmIChhbHQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0dGhpcy5hbHQgPSArYWx0O1xyXG5cdH1cclxufTtcclxuXHJcbkwuTGF0TG5nLnByb3RvdHlwZSA9IHtcclxuXHRlcXVhbHM6IGZ1bmN0aW9uIChvYmosIG1heE1hcmdpbikge1xyXG5cdFx0aWYgKCFvYmopIHsgcmV0dXJuIGZhbHNlOyB9XHJcblxyXG5cdFx0b2JqID0gTC5sYXRMbmcob2JqKTtcclxuXHJcblx0XHR2YXIgbWFyZ2luID0gTWF0aC5tYXgoXHJcblx0XHQgICAgICAgIE1hdGguYWJzKHRoaXMubGF0IC0gb2JqLmxhdCksXHJcblx0XHQgICAgICAgIE1hdGguYWJzKHRoaXMubG5nIC0gb2JqLmxuZykpO1xyXG5cclxuXHRcdHJldHVybiBtYXJnaW4gPD0gKG1heE1hcmdpbiA9PT0gdW5kZWZpbmVkID8gMS4wRS05IDogbWF4TWFyZ2luKTtcclxuXHR9LFxyXG5cclxuXHR0b1N0cmluZzogZnVuY3Rpb24gKHByZWNpc2lvbikge1xyXG5cdFx0cmV0dXJuICdMYXRMbmcoJyArXHJcblx0XHQgICAgICAgIEwuVXRpbC5mb3JtYXROdW0odGhpcy5sYXQsIHByZWNpc2lvbikgKyAnLCAnICtcclxuXHRcdCAgICAgICAgTC5VdGlsLmZvcm1hdE51bSh0aGlzLmxuZywgcHJlY2lzaW9uKSArICcpJztcclxuXHR9LFxyXG5cclxuXHRkaXN0YW5jZVRvOiBmdW5jdGlvbiAob3RoZXIpIHtcclxuXHRcdHJldHVybiBMLkNSUy5FYXJ0aC5kaXN0YW5jZSh0aGlzLCBMLmxhdExuZyhvdGhlcikpO1xyXG5cdH0sXHJcblxyXG5cdHdyYXA6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBMLkNSUy5FYXJ0aC53cmFwTGF0TG5nKHRoaXMpO1xyXG5cdH0sXHJcblxyXG5cdHRvQm91bmRzOiBmdW5jdGlvbiAoc2l6ZUluTWV0ZXJzKSB7XHJcblx0XHR2YXIgbGF0QWNjdXJhY3kgPSAxODAgKiBzaXplSW5NZXRlcnMgLyA0MDA3NTAxNyxcclxuXHRcdCAgICBsbmdBY2N1cmFjeSA9IGxhdEFjY3VyYWN5IC8gTWF0aC5jb3MoKE1hdGguUEkgLyAxODApICogdGhpcy5sYXQpO1xyXG5cclxuXHRcdHJldHVybiBMLmxhdExuZ0JvdW5kcyhcclxuXHRcdCAgICAgICAgW3RoaXMubGF0IC0gbGF0QWNjdXJhY3ksIHRoaXMubG5nIC0gbG5nQWNjdXJhY3ldLFxyXG5cdFx0ICAgICAgICBbdGhpcy5sYXQgKyBsYXRBY2N1cmFjeSwgdGhpcy5sbmcgKyBsbmdBY2N1cmFjeV0pO1xyXG5cdH0sXHJcblxyXG5cdGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKHRoaXMubGF0LCB0aGlzLmxuZywgdGhpcy5hbHQpO1xyXG5cdH1cclxufTtcclxuXHJcblxyXG4vLyBjb25zdHJ1Y3RzIExhdExuZyB3aXRoIGRpZmZlcmVudCBzaWduYXR1cmVzXHJcbi8vIChMYXRMbmcpIG9yIChbTnVtYmVyLCBOdW1iZXJdKSBvciAoTnVtYmVyLCBOdW1iZXIpIG9yIChPYmplY3QpXHJcblxyXG5MLmxhdExuZyA9IGZ1bmN0aW9uIChhLCBiLCBjKSB7XHJcblx0aWYgKGEgaW5zdGFuY2VvZiBMLkxhdExuZykge1xyXG5cdFx0cmV0dXJuIGE7XHJcblx0fVxyXG5cdGlmIChMLlV0aWwuaXNBcnJheShhKSAmJiB0eXBlb2YgYVswXSAhPT0gJ29iamVjdCcpIHtcclxuXHRcdGlmIChhLmxlbmd0aCA9PT0gMykge1xyXG5cdFx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKGFbMF0sIGFbMV0sIGFbMl0pO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGEubGVuZ3RoID09PSAyKSB7XHJcblx0XHRcdHJldHVybiBuZXcgTC5MYXRMbmcoYVswXSwgYVsxXSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblx0aWYgKGEgPT09IHVuZGVmaW5lZCB8fCBhID09PSBudWxsKSB7XHJcblx0XHRyZXR1cm4gYTtcclxuXHR9XHJcblx0aWYgKHR5cGVvZiBhID09PSAnb2JqZWN0JyAmJiAnbGF0JyBpbiBhKSB7XHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKGEubGF0LCAnbG5nJyBpbiBhID8gYS5sbmcgOiBhLmxvbiwgYS5hbHQpO1xyXG5cdH1cclxuXHRpZiAoYiA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblx0cmV0dXJuIG5ldyBMLkxhdExuZyhhLCBiLCBjKTtcclxufTtcclxuXG5cblxuLypcclxuICogTC5MYXRMbmdCb3VuZHMgcmVwcmVzZW50cyBhIHJlY3Rhbmd1bGFyIGFyZWEgb24gdGhlIG1hcCBpbiBnZW9ncmFwaGljYWwgY29vcmRpbmF0ZXMuXHJcbiAqL1xyXG5cclxuTC5MYXRMbmdCb3VuZHMgPSBmdW5jdGlvbiAoc291dGhXZXN0LCBub3J0aEVhc3QpIHsgLy8gKExhdExuZywgTGF0TG5nKSBvciAoTGF0TG5nW10pXHJcblx0aWYgKCFzb3V0aFdlc3QpIHsgcmV0dXJuOyB9XHJcblxyXG5cdHZhciBsYXRsbmdzID0gbm9ydGhFYXN0ID8gW3NvdXRoV2VzdCwgbm9ydGhFYXN0XSA6IHNvdXRoV2VzdDtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGxhdGxuZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdHRoaXMuZXh0ZW5kKGxhdGxuZ3NbaV0pO1xyXG5cdH1cclxufTtcclxuXHJcbkwuTGF0TG5nQm91bmRzLnByb3RvdHlwZSA9IHtcclxuXHJcblx0Ly8gZXh0ZW5kIHRoZSBib3VuZHMgdG8gY29udGFpbiB0aGUgZ2l2ZW4gcG9pbnQgb3IgYm91bmRzXHJcblx0ZXh0ZW5kOiBmdW5jdGlvbiAob2JqKSB7IC8vIChMYXRMbmcpIG9yIChMYXRMbmdCb3VuZHMpXHJcblx0XHR2YXIgc3cgPSB0aGlzLl9zb3V0aFdlc3QsXHJcblx0XHQgICAgbmUgPSB0aGlzLl9ub3J0aEVhc3QsXHJcblx0XHQgICAgc3cyLCBuZTI7XHJcblxyXG5cdFx0aWYgKG9iaiBpbnN0YW5jZW9mIEwuTGF0TG5nKSB7XHJcblx0XHRcdHN3MiA9IG9iajtcclxuXHRcdFx0bmUyID0gb2JqO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTC5MYXRMbmdCb3VuZHMpIHtcclxuXHRcdFx0c3cyID0gb2JqLl9zb3V0aFdlc3Q7XHJcblx0XHRcdG5lMiA9IG9iai5fbm9ydGhFYXN0O1xyXG5cclxuXHRcdFx0aWYgKCFzdzIgfHwgIW5lMikgeyByZXR1cm4gdGhpczsgfVxyXG5cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBvYmogPyB0aGlzLmV4dGVuZChMLmxhdExuZyhvYmopIHx8IEwubGF0TG5nQm91bmRzKG9iaikpIDogdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXN3ICYmICFuZSkge1xyXG5cdFx0XHR0aGlzLl9zb3V0aFdlc3QgPSBuZXcgTC5MYXRMbmcoc3cyLmxhdCwgc3cyLmxuZyk7XHJcblx0XHRcdHRoaXMuX25vcnRoRWFzdCA9IG5ldyBMLkxhdExuZyhuZTIubGF0LCBuZTIubG5nKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHN3LmxhdCA9IE1hdGgubWluKHN3Mi5sYXQsIHN3LmxhdCk7XHJcblx0XHRcdHN3LmxuZyA9IE1hdGgubWluKHN3Mi5sbmcsIHN3LmxuZyk7XHJcblx0XHRcdG5lLmxhdCA9IE1hdGgubWF4KG5lMi5sYXQsIG5lLmxhdCk7XHJcblx0XHRcdG5lLmxuZyA9IE1hdGgubWF4KG5lMi5sbmcsIG5lLmxuZyk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0Ly8gZXh0ZW5kIHRoZSBib3VuZHMgYnkgYSBwZXJjZW50YWdlXHJcblx0cGFkOiBmdW5jdGlvbiAoYnVmZmVyUmF0aW8pIHsgLy8gKE51bWJlcikgLT4gTGF0TG5nQm91bmRzXHJcblx0XHR2YXIgc3cgPSB0aGlzLl9zb3V0aFdlc3QsXHJcblx0XHQgICAgbmUgPSB0aGlzLl9ub3J0aEVhc3QsXHJcblx0XHQgICAgaGVpZ2h0QnVmZmVyID0gTWF0aC5hYnMoc3cubGF0IC0gbmUubGF0KSAqIGJ1ZmZlclJhdGlvLFxyXG5cdFx0ICAgIHdpZHRoQnVmZmVyID0gTWF0aC5hYnMoc3cubG5nIC0gbmUubG5nKSAqIGJ1ZmZlclJhdGlvO1xyXG5cclxuXHRcdHJldHVybiBuZXcgTC5MYXRMbmdCb3VuZHMoXHJcblx0XHQgICAgICAgIG5ldyBMLkxhdExuZyhzdy5sYXQgLSBoZWlnaHRCdWZmZXIsIHN3LmxuZyAtIHdpZHRoQnVmZmVyKSxcclxuXHRcdCAgICAgICAgbmV3IEwuTGF0TG5nKG5lLmxhdCArIGhlaWdodEJ1ZmZlciwgbmUubG5nICsgd2lkdGhCdWZmZXIpKTtcclxuXHR9LFxyXG5cclxuXHRnZXRDZW50ZXI6IGZ1bmN0aW9uICgpIHsgLy8gLT4gTGF0TG5nXHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKFxyXG5cdFx0ICAgICAgICAodGhpcy5fc291dGhXZXN0LmxhdCArIHRoaXMuX25vcnRoRWFzdC5sYXQpIC8gMixcclxuXHRcdCAgICAgICAgKHRoaXMuX3NvdXRoV2VzdC5sbmcgKyB0aGlzLl9ub3J0aEVhc3QubG5nKSAvIDIpO1xyXG5cdH0sXHJcblxyXG5cdGdldFNvdXRoV2VzdDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3NvdXRoV2VzdDtcclxuXHR9LFxyXG5cclxuXHRnZXROb3J0aEVhc3Q6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9ub3J0aEVhc3Q7XHJcblx0fSxcclxuXHJcblx0Z2V0Tm9ydGhXZXN0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKHRoaXMuZ2V0Tm9ydGgoKSwgdGhpcy5nZXRXZXN0KCkpO1xyXG5cdH0sXHJcblxyXG5cdGdldFNvdXRoRWFzdDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBMLkxhdExuZyh0aGlzLmdldFNvdXRoKCksIHRoaXMuZ2V0RWFzdCgpKTtcclxuXHR9LFxyXG5cclxuXHRnZXRXZXN0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fc291dGhXZXN0LmxuZztcclxuXHR9LFxyXG5cclxuXHRnZXRTb3V0aDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3NvdXRoV2VzdC5sYXQ7XHJcblx0fSxcclxuXHJcblx0Z2V0RWFzdDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX25vcnRoRWFzdC5sbmc7XHJcblx0fSxcclxuXHJcblx0Z2V0Tm9ydGg6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9ub3J0aEVhc3QubGF0O1xyXG5cdH0sXHJcblxyXG5cdGNvbnRhaW5zOiBmdW5jdGlvbiAob2JqKSB7IC8vIChMYXRMbmdCb3VuZHMpIG9yIChMYXRMbmcpIC0+IEJvb2xlYW5cclxuXHRcdGlmICh0eXBlb2Ygb2JqWzBdID09PSAnbnVtYmVyJyB8fCBvYmogaW5zdGFuY2VvZiBMLkxhdExuZykge1xyXG5cdFx0XHRvYmogPSBMLmxhdExuZyhvYmopO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0b2JqID0gTC5sYXRMbmdCb3VuZHMob2JqKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgc3cgPSB0aGlzLl9zb3V0aFdlc3QsXHJcblx0XHQgICAgbmUgPSB0aGlzLl9ub3J0aEVhc3QsXHJcblx0XHQgICAgc3cyLCBuZTI7XHJcblxyXG5cdFx0aWYgKG9iaiBpbnN0YW5jZW9mIEwuTGF0TG5nQm91bmRzKSB7XHJcblx0XHRcdHN3MiA9IG9iai5nZXRTb3V0aFdlc3QoKTtcclxuXHRcdFx0bmUyID0gb2JqLmdldE5vcnRoRWFzdCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0c3cyID0gbmUyID0gb2JqO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAoc3cyLmxhdCA+PSBzdy5sYXQpICYmIChuZTIubGF0IDw9IG5lLmxhdCkgJiZcclxuXHRcdCAgICAgICAoc3cyLmxuZyA+PSBzdy5sbmcpICYmIChuZTIubG5nIDw9IG5lLmxuZyk7XHJcblx0fSxcclxuXHJcblx0aW50ZXJzZWN0czogZnVuY3Rpb24gKGJvdW5kcykgeyAvLyAoTGF0TG5nQm91bmRzKSAtPiBCb29sZWFuXHJcblx0XHRib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhib3VuZHMpO1xyXG5cclxuXHRcdHZhciBzdyA9IHRoaXMuX3NvdXRoV2VzdCxcclxuXHRcdCAgICBuZSA9IHRoaXMuX25vcnRoRWFzdCxcclxuXHRcdCAgICBzdzIgPSBib3VuZHMuZ2V0U291dGhXZXN0KCksXHJcblx0XHQgICAgbmUyID0gYm91bmRzLmdldE5vcnRoRWFzdCgpLFxyXG5cclxuXHRcdCAgICBsYXRJbnRlcnNlY3RzID0gKG5lMi5sYXQgPj0gc3cubGF0KSAmJiAoc3cyLmxhdCA8PSBuZS5sYXQpLFxyXG5cdFx0ICAgIGxuZ0ludGVyc2VjdHMgPSAobmUyLmxuZyA+PSBzdy5sbmcpICYmIChzdzIubG5nIDw9IG5lLmxuZyk7XHJcblxyXG5cdFx0cmV0dXJuIGxhdEludGVyc2VjdHMgJiYgbG5nSW50ZXJzZWN0cztcclxuXHR9LFxyXG5cclxuXHRvdmVybGFwczogZnVuY3Rpb24gKGJvdW5kcykgeyAvLyAoTGF0TG5nQm91bmRzKSAtPiBCb29sZWFuXHJcblx0XHRib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhib3VuZHMpO1xyXG5cclxuXHRcdHZhciBzdyA9IHRoaXMuX3NvdXRoV2VzdCxcclxuXHRcdCAgICBuZSA9IHRoaXMuX25vcnRoRWFzdCxcclxuXHRcdCAgICBzdzIgPSBib3VuZHMuZ2V0U291dGhXZXN0KCksXHJcblx0XHQgICAgbmUyID0gYm91bmRzLmdldE5vcnRoRWFzdCgpLFxyXG5cclxuXHRcdCAgICBsYXRPdmVybGFwcyA9IChuZTIubGF0ID4gc3cubGF0KSAmJiAoc3cyLmxhdCA8IG5lLmxhdCksXHJcblx0XHQgICAgbG5nT3ZlcmxhcHMgPSAobmUyLmxuZyA+IHN3LmxuZykgJiYgKHN3Mi5sbmcgPCBuZS5sbmcpO1xyXG5cclxuXHRcdHJldHVybiBsYXRPdmVybGFwcyAmJiBsbmdPdmVybGFwcztcclxuXHR9LFxyXG5cclxuXHR0b0JCb3hTdHJpbmc6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBbdGhpcy5nZXRXZXN0KCksIHRoaXMuZ2V0U291dGgoKSwgdGhpcy5nZXRFYXN0KCksIHRoaXMuZ2V0Tm9ydGgoKV0uam9pbignLCcpO1xyXG5cdH0sXHJcblxyXG5cdGVxdWFsczogZnVuY3Rpb24gKGJvdW5kcykgeyAvLyAoTGF0TG5nQm91bmRzKVxyXG5cdFx0aWYgKCFib3VuZHMpIHsgcmV0dXJuIGZhbHNlOyB9XHJcblxyXG5cdFx0Ym91bmRzID0gTC5sYXRMbmdCb3VuZHMoYm91bmRzKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fc291dGhXZXN0LmVxdWFscyhib3VuZHMuZ2V0U291dGhXZXN0KCkpICYmXHJcblx0XHQgICAgICAgdGhpcy5fbm9ydGhFYXN0LmVxdWFscyhib3VuZHMuZ2V0Tm9ydGhFYXN0KCkpO1xyXG5cdH0sXHJcblxyXG5cdGlzVmFsaWQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiAhISh0aGlzLl9zb3V0aFdlc3QgJiYgdGhpcy5fbm9ydGhFYXN0KTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyBUT0RPIEludGVybmF0aW9uYWwgZGF0ZSBsaW5lP1xyXG5cclxuTC5sYXRMbmdCb3VuZHMgPSBmdW5jdGlvbiAoYSwgYikgeyAvLyAoTGF0TG5nQm91bmRzKSBvciAoTGF0TG5nLCBMYXRMbmcpXHJcblx0aWYgKCFhIHx8IGEgaW5zdGFuY2VvZiBMLkxhdExuZ0JvdW5kcykge1xyXG5cdFx0cmV0dXJuIGE7XHJcblx0fVxyXG5cdHJldHVybiBuZXcgTC5MYXRMbmdCb3VuZHMoYSwgYik7XHJcbn07XHJcblxuXG5cbi8qXHJcbiAqIFNpbXBsZSBlcXVpcmVjdGFuZ3VsYXIgKFBsYXRlIENhcnJlZSkgcHJvamVjdGlvbiwgdXNlZCBieSBDUlMgbGlrZSBFUFNHOjQzMjYgYW5kIFNpbXBsZS5cclxuICovXHJcblxyXG5MLlByb2plY3Rpb24gPSB7fTtcclxuXHJcbkwuUHJvamVjdGlvbi5Mb25MYXQgPSB7XHJcblx0cHJvamVjdDogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0cmV0dXJuIG5ldyBMLlBvaW50KGxhdGxuZy5sbmcsIGxhdGxuZy5sYXQpO1xyXG5cdH0sXHJcblxyXG5cdHVucHJvamVjdDogZnVuY3Rpb24gKHBvaW50KSB7XHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKHBvaW50LnksIHBvaW50LngpO1xyXG5cdH0sXHJcblxyXG5cdGJvdW5kczogTC5ib3VuZHMoWy0xODAsIC05MF0sIFsxODAsIDkwXSlcclxufTtcclxuXG5cblxuLypcclxuICogU3BoZXJpY2FsIE1lcmNhdG9yIGlzIHRoZSBtb3N0IHBvcHVsYXIgbWFwIHByb2plY3Rpb24sIHVzZWQgYnkgRVBTRzozODU3IENSUyB1c2VkIGJ5IGRlZmF1bHQuXHJcbiAqL1xyXG5cclxuTC5Qcm9qZWN0aW9uLlNwaGVyaWNhbE1lcmNhdG9yID0ge1xyXG5cclxuXHRSOiA2Mzc4MTM3LFxyXG5cdE1BWF9MQVRJVFVERTogODUuMDUxMTI4Nzc5OCxcclxuXHJcblx0cHJvamVjdDogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0dmFyIGQgPSBNYXRoLlBJIC8gMTgwLFxyXG5cdFx0ICAgIG1heCA9IHRoaXMuTUFYX0xBVElUVURFLFxyXG5cdFx0ICAgIGxhdCA9IE1hdGgubWF4KE1hdGgubWluKG1heCwgbGF0bG5nLmxhdCksIC1tYXgpLFxyXG5cdFx0ICAgIHNpbiA9IE1hdGguc2luKGxhdCAqIGQpO1xyXG5cclxuXHRcdHJldHVybiBuZXcgTC5Qb2ludChcclxuXHRcdFx0XHR0aGlzLlIgKiBsYXRsbmcubG5nICogZCxcclxuXHRcdFx0XHR0aGlzLlIgKiBNYXRoLmxvZygoMSArIHNpbikgLyAoMSAtIHNpbikpIC8gMik7XHJcblx0fSxcclxuXHJcblx0dW5wcm9qZWN0OiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHZhciBkID0gMTgwIC8gTWF0aC5QSTtcclxuXHJcblx0XHRyZXR1cm4gbmV3IEwuTGF0TG5nKFxyXG5cdFx0XHQoMiAqIE1hdGguYXRhbihNYXRoLmV4cChwb2ludC55IC8gdGhpcy5SKSkgLSAoTWF0aC5QSSAvIDIpKSAqIGQsXHJcblx0XHRcdHBvaW50LnggKiBkIC8gdGhpcy5SKTtcclxuXHR9LFxyXG5cclxuXHRib3VuZHM6IChmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgZCA9IDYzNzgxMzcgKiBNYXRoLlBJO1xyXG5cdFx0cmV0dXJuIEwuYm91bmRzKFstZCwgLWRdLCBbZCwgZF0pO1xyXG5cdH0pKClcclxufTtcclxuXG5cblxuLypcclxuICogTC5DUlMgaXMgdGhlIGJhc2Ugb2JqZWN0IGZvciBhbGwgZGVmaW5lZCBDUlMgKENvb3JkaW5hdGUgUmVmZXJlbmNlIFN5c3RlbXMpIGluIExlYWZsZXQuXHJcbiAqL1xyXG5cclxuTC5DUlMgPSB7XHJcblx0Ly8gY29udmVydHMgZ2VvIGNvb3JkcyB0byBwaXhlbCBvbmVzXHJcblx0bGF0TG5nVG9Qb2ludDogZnVuY3Rpb24gKGxhdGxuZywgem9vbSkge1xyXG5cdFx0dmFyIHByb2plY3RlZFBvaW50ID0gdGhpcy5wcm9qZWN0aW9uLnByb2plY3QobGF0bG5nKSxcclxuXHRcdCAgICBzY2FsZSA9IHRoaXMuc2NhbGUoem9vbSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMudHJhbnNmb3JtYXRpb24uX3RyYW5zZm9ybShwcm9qZWN0ZWRQb2ludCwgc2NhbGUpO1xyXG5cdH0sXHJcblxyXG5cdC8vIGNvbnZlcnRzIHBpeGVsIGNvb3JkcyB0byBnZW8gY29vcmRzXHJcblx0cG9pbnRUb0xhdExuZzogZnVuY3Rpb24gKHBvaW50LCB6b29tKSB7XHJcblx0XHR2YXIgc2NhbGUgPSB0aGlzLnNjYWxlKHpvb20pLFxyXG5cdFx0ICAgIHVudHJhbnNmb3JtZWRQb2ludCA9IHRoaXMudHJhbnNmb3JtYXRpb24udW50cmFuc2Zvcm0ocG9pbnQsIHNjYWxlKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5wcm9qZWN0aW9uLnVucHJvamVjdCh1bnRyYW5zZm9ybWVkUG9pbnQpO1xyXG5cdH0sXHJcblxyXG5cdC8vIGNvbnZlcnRzIGdlbyBjb29yZHMgdG8gcHJvamVjdGlvbi1zcGVjaWZpYyBjb29yZHMgKGUuZy4gaW4gbWV0ZXJzKVxyXG5cdHByb2plY3Q6IGZ1bmN0aW9uIChsYXRsbmcpIHtcclxuXHRcdHJldHVybiB0aGlzLnByb2plY3Rpb24ucHJvamVjdChsYXRsbmcpO1xyXG5cdH0sXHJcblxyXG5cdC8vIGNvbnZlcnRzIHByb2plY3RlZCBjb29yZHMgdG8gZ2VvIGNvb3Jkc1xyXG5cdHVucHJvamVjdDogZnVuY3Rpb24gKHBvaW50KSB7XHJcblx0XHRyZXR1cm4gdGhpcy5wcm9qZWN0aW9uLnVucHJvamVjdChwb2ludCk7XHJcblx0fSxcclxuXHJcblx0Ly8gZGVmaW5lcyBob3cgdGhlIHdvcmxkIHNjYWxlcyB3aXRoIHpvb21cclxuXHRzY2FsZTogZnVuY3Rpb24gKHpvb20pIHtcclxuXHRcdHJldHVybiAyNTYgKiBNYXRoLnBvdygyLCB6b29tKTtcclxuXHR9LFxyXG5cclxuXHR6b29tOiBmdW5jdGlvbiAoc2NhbGUpIHtcclxuXHRcdHJldHVybiBNYXRoLmxvZyhzY2FsZSAvIDI1NikgLyBNYXRoLkxOMjtcclxuXHR9LFxyXG5cclxuXHQvLyByZXR1cm5zIHRoZSBib3VuZHMgb2YgdGhlIHdvcmxkIGluIHByb2plY3RlZCBjb29yZHMgaWYgYXBwbGljYWJsZVxyXG5cdGdldFByb2plY3RlZEJvdW5kczogZnVuY3Rpb24gKHpvb20pIHtcclxuXHRcdGlmICh0aGlzLmluZmluaXRlKSB7IHJldHVybiBudWxsOyB9XHJcblxyXG5cdFx0dmFyIGIgPSB0aGlzLnByb2plY3Rpb24uYm91bmRzLFxyXG5cdFx0ICAgIHMgPSB0aGlzLnNjYWxlKHpvb20pLFxyXG5cdFx0ICAgIG1pbiA9IHRoaXMudHJhbnNmb3JtYXRpb24udHJhbnNmb3JtKGIubWluLCBzKSxcclxuXHRcdCAgICBtYXggPSB0aGlzLnRyYW5zZm9ybWF0aW9uLnRyYW5zZm9ybShiLm1heCwgcyk7XHJcblxyXG5cdFx0cmV0dXJuIEwuYm91bmRzKG1pbiwgbWF4KTtcclxuXHR9LFxyXG5cclxuXHQvLyB3aGV0aGVyIGEgY29vcmRpbmF0ZSBheGlzIHdyYXBzIGluIGEgZ2l2ZW4gcmFuZ2UgKGUuZy4gbG9uZ2l0dWRlIGZyb20gLTE4MCB0byAxODApOyBkZXBlbmRzIG9uIENSU1xyXG5cdC8vIHdyYXBMbmc6IFttaW4sIG1heF0sXHJcblx0Ly8gd3JhcExhdDogW21pbiwgbWF4XSxcclxuXHJcblx0Ly8gaWYgdHJ1ZSwgdGhlIGNvb3JkaW5hdGUgc3BhY2Ugd2lsbCBiZSB1bmJvdW5kZWQgKGluZmluaXRlIGluIGFsbCBkaXJlY3Rpb25zKVxyXG5cdC8vIGluZmluaXRlOiBmYWxzZSxcclxuXHJcblx0Ly8gd3JhcHMgZ2VvIGNvb3JkcyBpbiBjZXJ0YWluIHJhbmdlcyBpZiBhcHBsaWNhYmxlXHJcblx0d3JhcExhdExuZzogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0dmFyIGxuZyA9IHRoaXMud3JhcExuZyA/IEwuVXRpbC53cmFwTnVtKGxhdGxuZy5sbmcsIHRoaXMud3JhcExuZywgdHJ1ZSkgOiBsYXRsbmcubG5nLFxyXG5cdFx0ICAgIGxhdCA9IHRoaXMud3JhcExhdCA/IEwuVXRpbC53cmFwTnVtKGxhdGxuZy5sYXQsIHRoaXMud3JhcExhdCwgdHJ1ZSkgOiBsYXRsbmcubGF0LFxyXG5cdFx0ICAgIGFsdCA9IGxhdGxuZy5hbHQ7XHJcblxyXG5cdFx0cmV0dXJuIEwubGF0TG5nKGxhdCwgbG5nLCBhbHQpO1xyXG5cdH1cclxufTtcclxuXG5cblxuLypcbiAqIEEgc2ltcGxlIENSUyB0aGF0IGNhbiBiZSB1c2VkIGZvciBmbGF0IG5vbi1FYXJ0aCBtYXBzIGxpa2UgcGFub3JhbWFzIG9yIGdhbWUgbWFwcy5cbiAqL1xuXG5MLkNSUy5TaW1wbGUgPSBMLmV4dGVuZCh7fSwgTC5DUlMsIHtcblx0cHJvamVjdGlvbjogTC5Qcm9qZWN0aW9uLkxvbkxhdCxcblx0dHJhbnNmb3JtYXRpb246IG5ldyBMLlRyYW5zZm9ybWF0aW9uKDEsIDAsIC0xLCAwKSxcblxuXHRzY2FsZTogZnVuY3Rpb24gKHpvb20pIHtcblx0XHRyZXR1cm4gTWF0aC5wb3coMiwgem9vbSk7XG5cdH0sXG5cblx0em9vbTogZnVuY3Rpb24gKHNjYWxlKSB7XG5cdFx0cmV0dXJuIE1hdGgubG9nKHNjYWxlKSAvIE1hdGguTE4yO1xuXHR9LFxuXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAobGF0bG5nMSwgbGF0bG5nMikge1xuXHRcdHZhciBkeCA9IGxhdGxuZzIubG5nIC0gbGF0bG5nMS5sbmcsXG5cdFx0ICAgIGR5ID0gbGF0bG5nMi5sYXQgLSBsYXRsbmcxLmxhdDtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuXHR9LFxuXG5cdGluZmluaXRlOiB0cnVlXG59KTtcblxuXG5cbi8qXG4gKiBMLkNSUy5FYXJ0aCBpcyB0aGUgYmFzZSBjbGFzcyBmb3IgYWxsIENSUyByZXByZXNlbnRpbmcgRWFydGguXG4gKi9cblxuTC5DUlMuRWFydGggPSBMLmV4dGVuZCh7fSwgTC5DUlMsIHtcblx0d3JhcExuZzogWy0xODAsIDE4MF0sXG5cblx0UjogNjM3ODEzNyxcblxuXHQvLyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBnZW9ncmFwaGljYWwgcG9pbnRzIHVzaW5nIHNwaGVyaWNhbCBsYXcgb2YgY29zaW5lcyBhcHByb3hpbWF0aW9uXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAobGF0bG5nMSwgbGF0bG5nMikge1xuXHRcdHZhciByYWQgPSBNYXRoLlBJIC8gMTgwLFxuXHRcdCAgICBsYXQxID0gbGF0bG5nMS5sYXQgKiByYWQsXG5cdFx0ICAgIGxhdDIgPSBsYXRsbmcyLmxhdCAqIHJhZCxcblx0XHQgICAgYSA9IE1hdGguc2luKGxhdDEpICogTWF0aC5zaW4obGF0MikgK1xuXHRcdCAgICAgICAgTWF0aC5jb3MobGF0MSkgKiBNYXRoLmNvcyhsYXQyKSAqIE1hdGguY29zKChsYXRsbmcyLmxuZyAtIGxhdGxuZzEubG5nKSAqIHJhZCk7XG5cblx0XHRyZXR1cm4gdGhpcy5SICogTWF0aC5hY29zKE1hdGgubWluKGEsIDEpKTtcblx0fVxufSk7XG5cblxuXG4vKlxyXG4gKiBMLkNSUy5FUFNHMzg1NyAoU3BoZXJpY2FsIE1lcmNhdG9yKSBpcyB0aGUgbW9zdCBjb21tb24gQ1JTIGZvciB3ZWIgbWFwcGluZyBhbmQgaXMgdXNlZCBieSBMZWFmbGV0IGJ5IGRlZmF1bHQuXHJcbiAqL1xyXG5cclxuTC5DUlMuRVBTRzM4NTcgPSBMLmV4dGVuZCh7fSwgTC5DUlMuRWFydGgsIHtcclxuXHRjb2RlOiAnRVBTRzozODU3JyxcclxuXHRwcm9qZWN0aW9uOiBMLlByb2plY3Rpb24uU3BoZXJpY2FsTWVyY2F0b3IsXHJcblxyXG5cdHRyYW5zZm9ybWF0aW9uOiAoZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIHNjYWxlID0gMC41IC8gKE1hdGguUEkgKiBMLlByb2plY3Rpb24uU3BoZXJpY2FsTWVyY2F0b3IuUik7XHJcblx0XHRyZXR1cm4gbmV3IEwuVHJhbnNmb3JtYXRpb24oc2NhbGUsIDAuNSwgLXNjYWxlLCAwLjUpO1xyXG5cdH0oKSlcclxufSk7XHJcblxyXG5MLkNSUy5FUFNHOTAwOTEzID0gTC5leHRlbmQoe30sIEwuQ1JTLkVQU0czODU3LCB7XHJcblx0Y29kZTogJ0VQU0c6OTAwOTEzJ1xyXG59KTtcclxuXG5cblxuLypcclxuICogTC5DUlMuRVBTRzQzMjYgaXMgYSBDUlMgcG9wdWxhciBhbW9uZyBhZHZhbmNlZCBHSVMgc3BlY2lhbGlzdHMuXHJcbiAqL1xyXG5cclxuTC5DUlMuRVBTRzQzMjYgPSBMLmV4dGVuZCh7fSwgTC5DUlMuRWFydGgsIHtcclxuXHRjb2RlOiAnRVBTRzo0MzI2JyxcclxuXHRwcm9qZWN0aW9uOiBMLlByb2plY3Rpb24uTG9uTGF0LFxyXG5cdHRyYW5zZm9ybWF0aW9uOiBuZXcgTC5UcmFuc2Zvcm1hdGlvbigxIC8gMTgwLCAxLCAtMSAvIDE4MCwgMC41KVxyXG59KTtcclxuXG5cblxuLypcclxuICogTC5NYXAgaXMgdGhlIGNlbnRyYWwgY2xhc3Mgb2YgdGhlIEFQSSAtIGl0IGlzIHVzZWQgdG8gY3JlYXRlIGEgbWFwLlxyXG4gKi9cclxuXHJcbkwuTWFwID0gTC5FdmVudGVkLmV4dGVuZCh7XHJcblxyXG5cdG9wdGlvbnM6IHtcclxuXHRcdGNyczogTC5DUlMuRVBTRzM4NTcsXHJcblxyXG5cdFx0LypcclxuXHRcdGNlbnRlcjogTGF0TG5nLFxyXG5cdFx0em9vbTogTnVtYmVyLFxyXG5cdFx0bGF5ZXJzOiBBcnJheSxcclxuXHRcdCovXHJcblxyXG5cdFx0ZmFkZUFuaW1hdGlvbjogdHJ1ZSxcclxuXHRcdHRyYWNrUmVzaXplOiB0cnVlLFxyXG5cdFx0bWFya2VyWm9vbUFuaW1hdGlvbjogdHJ1ZSxcclxuXHRcdG1heEJvdW5kc1Zpc2Nvc2l0eTogMC4wLFxyXG5cdFx0dHJhbnNmb3JtM0RMaW1pdDogODM4ODYwOCAvLyBQcmVjaXNpb24gbGltaXQgb2YgYSAzMi1iaXQgZmxvYXRcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAoaWQsIG9wdGlvbnMpIHsgLy8gKEhUTUxFbGVtZW50IG9yIFN0cmluZywgT2JqZWN0KVxyXG5cdFx0b3B0aW9ucyA9IEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcclxuXHJcblx0XHR0aGlzLl9pbml0Q29udGFpbmVyKGlkKTtcclxuXHRcdHRoaXMuX2luaXRMYXlvdXQoKTtcclxuXHJcblx0XHQvLyBoYWNrIGZvciBodHRwczovL2dpdGh1Yi5jb20vTGVhZmxldC9MZWFmbGV0L2lzc3Vlcy8xOTgwXHJcblx0XHR0aGlzLl9vblJlc2l6ZSA9IEwuYmluZCh0aGlzLl9vblJlc2l6ZSwgdGhpcyk7XHJcblxyXG5cdFx0dGhpcy5faW5pdEV2ZW50cygpO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLm1heEJvdW5kcykge1xyXG5cdFx0XHR0aGlzLnNldE1heEJvdW5kcyhvcHRpb25zLm1heEJvdW5kcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKG9wdGlvbnMuem9vbSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuX3pvb20gPSB0aGlzLl9saW1pdFpvb20ob3B0aW9ucy56b29tKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAob3B0aW9ucy5jZW50ZXIgJiYgb3B0aW9ucy56b29tICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5zZXRWaWV3KEwubGF0TG5nKG9wdGlvbnMuY2VudGVyKSwgb3B0aW9ucy56b29tLCB7cmVzZXQ6IHRydWV9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9oYW5kbGVycyA9IFtdO1xyXG5cdFx0dGhpcy5fbGF5ZXJzID0ge307XHJcblx0XHR0aGlzLl96b29tQm91bmRMYXllcnMgPSB7fTtcclxuXHRcdHRoaXMuX3NpemVDaGFuZ2VkID0gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLmNhbGxJbml0SG9va3MoKTtcclxuXHJcblx0XHR0aGlzLl9hZGRMYXllcnModGhpcy5vcHRpb25zLmxheWVycyk7XHJcblx0fSxcclxuXHJcblxyXG5cdC8vIHB1YmxpYyBtZXRob2RzIHRoYXQgbW9kaWZ5IG1hcCBzdGF0ZVxyXG5cclxuXHQvLyByZXBsYWNlZCBieSBhbmltYXRpb24tcG93ZXJlZCBpbXBsZW1lbnRhdGlvbiBpbiBNYXAuUGFuQW5pbWF0aW9uLmpzXHJcblx0c2V0VmlldzogZnVuY3Rpb24gKGNlbnRlciwgem9vbSkge1xyXG5cdFx0em9vbSA9IHpvb20gPT09IHVuZGVmaW5lZCA/IHRoaXMuZ2V0Wm9vbSgpIDogem9vbTtcclxuXHRcdHRoaXMuX3Jlc2V0VmlldyhMLmxhdExuZyhjZW50ZXIpLCB6b29tKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNldFpvb206IGZ1bmN0aW9uICh6b29tLCBvcHRpb25zKSB7XHJcblx0XHRpZiAoIXRoaXMuX2xvYWRlZCkge1xyXG5cdFx0XHR0aGlzLl96b29tID0gem9vbTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5zZXRWaWV3KHRoaXMuZ2V0Q2VudGVyKCksIHpvb20sIHt6b29tOiBvcHRpb25zfSk7XHJcblx0fSxcclxuXHJcblx0em9vbUluOiBmdW5jdGlvbiAoZGVsdGEsIG9wdGlvbnMpIHtcclxuXHRcdHJldHVybiB0aGlzLnNldFpvb20odGhpcy5fem9vbSArIChkZWx0YSB8fCAxKSwgb3B0aW9ucyk7XHJcblx0fSxcclxuXHJcblx0em9vbU91dDogZnVuY3Rpb24gKGRlbHRhLCBvcHRpb25zKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZXRab29tKHRoaXMuX3pvb20gLSAoZGVsdGEgfHwgMSksIG9wdGlvbnMpO1xyXG5cdH0sXHJcblxyXG5cdHNldFpvb21Bcm91bmQ6IGZ1bmN0aW9uIChsYXRsbmcsIHpvb20sIG9wdGlvbnMpIHtcclxuXHRcdHZhciBzY2FsZSA9IHRoaXMuZ2V0Wm9vbVNjYWxlKHpvb20pLFxyXG5cdFx0ICAgIHZpZXdIYWxmID0gdGhpcy5nZXRTaXplKCkuZGl2aWRlQnkoMiksXHJcblx0XHQgICAgY29udGFpbmVyUG9pbnQgPSBsYXRsbmcgaW5zdGFuY2VvZiBMLlBvaW50ID8gbGF0bG5nIDogdGhpcy5sYXRMbmdUb0NvbnRhaW5lclBvaW50KGxhdGxuZyksXHJcblxyXG5cdFx0ICAgIGNlbnRlck9mZnNldCA9IGNvbnRhaW5lclBvaW50LnN1YnRyYWN0KHZpZXdIYWxmKS5tdWx0aXBseUJ5KDEgLSAxIC8gc2NhbGUpLFxyXG5cdFx0ICAgIG5ld0NlbnRlciA9IHRoaXMuY29udGFpbmVyUG9pbnRUb0xhdExuZyh2aWV3SGFsZi5hZGQoY2VudGVyT2Zmc2V0KSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuc2V0VmlldyhuZXdDZW50ZXIsIHpvb20sIHt6b29tOiBvcHRpb25zfSk7XHJcblx0fSxcclxuXHJcblx0X2dldEJvdW5kc0NlbnRlclpvb206IGZ1bmN0aW9uIChib3VuZHMsIG9wdGlvbnMpIHtcclxuXHJcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHRcdGJvdW5kcyA9IGJvdW5kcy5nZXRCb3VuZHMgPyBib3VuZHMuZ2V0Qm91bmRzKCkgOiBMLmxhdExuZ0JvdW5kcyhib3VuZHMpO1xyXG5cclxuXHRcdHZhciBwYWRkaW5nVEwgPSBMLnBvaW50KG9wdGlvbnMucGFkZGluZ1RvcExlZnQgfHwgb3B0aW9ucy5wYWRkaW5nIHx8IFswLCAwXSksXHJcblx0XHQgICAgcGFkZGluZ0JSID0gTC5wb2ludChvcHRpb25zLnBhZGRpbmdCb3R0b21SaWdodCB8fCBvcHRpb25zLnBhZGRpbmcgfHwgWzAsIDBdKSxcclxuXHJcblx0XHQgICAgem9vbSA9IHRoaXMuZ2V0Qm91bmRzWm9vbShib3VuZHMsIGZhbHNlLCBwYWRkaW5nVEwuYWRkKHBhZGRpbmdCUikpO1xyXG5cclxuXHRcdHpvb20gPSBvcHRpb25zLm1heFpvb20gPyBNYXRoLm1pbihvcHRpb25zLm1heFpvb20sIHpvb20pIDogem9vbTtcclxuXHJcblx0XHR2YXIgcGFkZGluZ09mZnNldCA9IHBhZGRpbmdCUi5zdWJ0cmFjdChwYWRkaW5nVEwpLmRpdmlkZUJ5KDIpLFxyXG5cclxuXHRcdCAgICBzd1BvaW50ID0gdGhpcy5wcm9qZWN0KGJvdW5kcy5nZXRTb3V0aFdlc3QoKSwgem9vbSksXHJcblx0XHQgICAgbmVQb2ludCA9IHRoaXMucHJvamVjdChib3VuZHMuZ2V0Tm9ydGhFYXN0KCksIHpvb20pLFxyXG5cdFx0ICAgIGNlbnRlciA9IHRoaXMudW5wcm9qZWN0KHN3UG9pbnQuYWRkKG5lUG9pbnQpLmRpdmlkZUJ5KDIpLmFkZChwYWRkaW5nT2Zmc2V0KSwgem9vbSk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2VudGVyOiBjZW50ZXIsXHJcblx0XHRcdHpvb206IHpvb21cclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0Zml0Qm91bmRzOiBmdW5jdGlvbiAoYm91bmRzLCBvcHRpb25zKSB7XHJcblx0XHR2YXIgdGFyZ2V0ID0gdGhpcy5fZ2V0Qm91bmRzQ2VudGVyWm9vbShib3VuZHMsIG9wdGlvbnMpO1xyXG5cdFx0cmV0dXJuIHRoaXMuc2V0Vmlldyh0YXJnZXQuY2VudGVyLCB0YXJnZXQuem9vbSwgb3B0aW9ucyk7XHJcblx0fSxcclxuXHJcblx0Zml0V29ybGQ6IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5maXRCb3VuZHMoW1stOTAsIC0xODBdLCBbOTAsIDE4MF1dLCBvcHRpb25zKTtcclxuXHR9LFxyXG5cclxuXHRwYW5UbzogZnVuY3Rpb24gKGNlbnRlciwgb3B0aW9ucykgeyAvLyAoTGF0TG5nKVxyXG5cdFx0cmV0dXJuIHRoaXMuc2V0VmlldyhjZW50ZXIsIHRoaXMuX3pvb20sIHtwYW46IG9wdGlvbnN9KTtcclxuXHR9LFxyXG5cclxuXHRwYW5CeTogZnVuY3Rpb24gKG9mZnNldCkgeyAvLyAoUG9pbnQpXHJcblx0XHQvLyByZXBsYWNlZCB3aXRoIGFuaW1hdGVkIHBhbkJ5IGluIE1hcC5QYW5BbmltYXRpb24uanNcclxuXHRcdHRoaXMuZmlyZSgnbW92ZXN0YXJ0Jyk7XHJcblxyXG5cdFx0dGhpcy5fcmF3UGFuQnkoTC5wb2ludChvZmZzZXQpKTtcclxuXHJcblx0XHR0aGlzLmZpcmUoJ21vdmUnKTtcclxuXHRcdHJldHVybiB0aGlzLmZpcmUoJ21vdmVlbmQnKTtcclxuXHR9LFxyXG5cclxuXHRzZXRNYXhCb3VuZHM6IGZ1bmN0aW9uIChib3VuZHMpIHtcclxuXHRcdGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKGJvdW5kcyk7XHJcblxyXG5cdFx0aWYgKCFib3VuZHMpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub2ZmKCdtb3ZlZW5kJywgdGhpcy5fcGFuSW5zaWRlTWF4Qm91bmRzKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLm1heEJvdW5kcykge1xyXG5cdFx0XHR0aGlzLm9mZignbW92ZWVuZCcsIHRoaXMuX3Bhbkluc2lkZU1heEJvdW5kcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5vcHRpb25zLm1heEJvdW5kcyA9IGJvdW5kcztcclxuXHJcblx0XHRpZiAodGhpcy5fbG9hZGVkKSB7XHJcblx0XHRcdHRoaXMuX3Bhbkluc2lkZU1heEJvdW5kcygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLm9uKCdtb3ZlZW5kJywgdGhpcy5fcGFuSW5zaWRlTWF4Qm91bmRzKTtcclxuXHR9LFxyXG5cclxuXHRzZXRNaW5ab29tOiBmdW5jdGlvbiAoem9vbSkge1xyXG5cdFx0dGhpcy5vcHRpb25zLm1pblpvb20gPSB6b29tO1xyXG5cclxuXHRcdGlmICh0aGlzLl9sb2FkZWQgJiYgdGhpcy5nZXRab29tKCkgPCB0aGlzLm9wdGlvbnMubWluWm9vbSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5zZXRab29tKHpvb20pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNldE1heFpvb206IGZ1bmN0aW9uICh6b29tKSB7XHJcblx0XHR0aGlzLm9wdGlvbnMubWF4Wm9vbSA9IHpvb207XHJcblxyXG5cdFx0aWYgKHRoaXMuX2xvYWRlZCAmJiAodGhpcy5nZXRab29tKCkgPiB0aGlzLm9wdGlvbnMubWF4Wm9vbSkpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuc2V0Wm9vbSh6b29tKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRwYW5JbnNpZGVCb3VuZHM6IGZ1bmN0aW9uIChib3VuZHMsIG9wdGlvbnMpIHtcclxuXHRcdHRoaXMuX2VuZm9yY2luZ0JvdW5kcyA9IHRydWU7XHJcblx0XHR2YXIgY2VudGVyID0gdGhpcy5nZXRDZW50ZXIoKSxcclxuXHRcdCAgICBuZXdDZW50ZXIgPSB0aGlzLl9saW1pdENlbnRlcihjZW50ZXIsIHRoaXMuX3pvb20sIEwubGF0TG5nQm91bmRzKGJvdW5kcykpO1xyXG5cclxuXHRcdGlmIChjZW50ZXIuZXF1YWxzKG5ld0NlbnRlcikpIHsgcmV0dXJuIHRoaXM7IH1cclxuXHJcblx0XHR0aGlzLnBhblRvKG5ld0NlbnRlciwgb3B0aW9ucyk7XHJcblx0XHR0aGlzLl9lbmZvcmNpbmdCb3VuZHMgPSBmYWxzZTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGludmFsaWRhdGVTaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdFx0aWYgKCF0aGlzLl9sb2FkZWQpIHsgcmV0dXJuIHRoaXM7IH1cclxuXHJcblx0XHRvcHRpb25zID0gTC5leHRlbmQoe1xyXG5cdFx0XHRhbmltYXRlOiBmYWxzZSxcclxuXHRcdFx0cGFuOiB0cnVlXHJcblx0XHR9LCBvcHRpb25zID09PSB0cnVlID8ge2FuaW1hdGU6IHRydWV9IDogb3B0aW9ucyk7XHJcblxyXG5cdFx0dmFyIG9sZFNpemUgPSB0aGlzLmdldFNpemUoKTtcclxuXHRcdHRoaXMuX3NpemVDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdHRoaXMuX2xhc3RDZW50ZXIgPSBudWxsO1xyXG5cclxuXHRcdHZhciBuZXdTaXplID0gdGhpcy5nZXRTaXplKCksXHJcblx0XHQgICAgb2xkQ2VudGVyID0gb2xkU2l6ZS5kaXZpZGVCeSgyKS5yb3VuZCgpLFxyXG5cdFx0ICAgIG5ld0NlbnRlciA9IG5ld1NpemUuZGl2aWRlQnkoMikucm91bmQoKSxcclxuXHRcdCAgICBvZmZzZXQgPSBvbGRDZW50ZXIuc3VidHJhY3QobmV3Q2VudGVyKTtcclxuXHJcblx0XHRpZiAoIW9mZnNldC54ICYmICFvZmZzZXQueSkgeyByZXR1cm4gdGhpczsgfVxyXG5cclxuXHRcdGlmIChvcHRpb25zLmFuaW1hdGUgJiYgb3B0aW9ucy5wYW4pIHtcclxuXHRcdFx0dGhpcy5wYW5CeShvZmZzZXQpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChvcHRpb25zLnBhbikge1xyXG5cdFx0XHRcdHRoaXMuX3Jhd1BhbkJ5KG9mZnNldCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuZmlyZSgnbW92ZScpO1xyXG5cclxuXHRcdFx0aWYgKG9wdGlvbnMuZGVib3VuY2VNb3ZlZW5kKSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX3NpemVUaW1lcik7XHJcblx0XHRcdFx0dGhpcy5fc2l6ZVRpbWVyID0gc2V0VGltZW91dChMLmJpbmQodGhpcy5maXJlLCB0aGlzLCAnbW92ZWVuZCcpLCAyMDApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuZmlyZSgnbW92ZWVuZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuZmlyZSgncmVzaXplJywge1xyXG5cdFx0XHRvbGRTaXplOiBvbGRTaXplLFxyXG5cdFx0XHRuZXdTaXplOiBuZXdTaXplXHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHRzdG9wOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2ZseVRvRnJhbWUpO1xyXG5cdFx0aWYgKHRoaXMuX3BhbkFuaW0pIHtcclxuXHRcdFx0dGhpcy5fcGFuQW5pbS5zdG9wKCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHQvLyBUT0RPIGhhbmRsZXIuYWRkVG9cclxuXHRhZGRIYW5kbGVyOiBmdW5jdGlvbiAobmFtZSwgSGFuZGxlckNsYXNzKSB7XHJcblx0XHRpZiAoIUhhbmRsZXJDbGFzcykgeyByZXR1cm4gdGhpczsgfVxyXG5cclxuXHRcdHZhciBoYW5kbGVyID0gdGhpc1tuYW1lXSA9IG5ldyBIYW5kbGVyQ2xhc3ModGhpcyk7XHJcblxyXG5cdFx0dGhpcy5faGFuZGxlcnMucHVzaChoYW5kbGVyKTtcclxuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zW25hbWVdKSB7XHJcblx0XHRcdGhhbmRsZXIuZW5hYmxlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0dGhpcy5faW5pdEV2ZW50cyh0cnVlKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyB0aHJvd3MgZXJyb3IgaW4gSUU2LThcclxuXHRcdFx0ZGVsZXRlIHRoaXMuX2NvbnRhaW5lci5fbGVhZmxldDtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0dGhpcy5fY29udGFpbmVyLl9sZWFmbGV0ID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fbWFwUGFuZSk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX2NsZWFyQ29udHJvbFBvcykge1xyXG5cdFx0XHR0aGlzLl9jbGVhckNvbnRyb2xQb3MoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9jbGVhckhhbmRsZXJzKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX2xvYWRlZCkge1xyXG5cdFx0XHR0aGlzLmZpcmUoJ3VubG9hZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5fbGF5ZXJzKSB7XHJcblx0XHRcdHRoaXMuX2xheWVyc1tpXS5yZW1vdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRjcmVhdGVQYW5lOiBmdW5jdGlvbiAobmFtZSwgY29udGFpbmVyKSB7XHJcblx0XHR2YXIgY2xhc3NOYW1lID0gJ2xlYWZsZXQtcGFuZScgKyAobmFtZSA/ICcgbGVhZmxldC0nICsgbmFtZS5yZXBsYWNlKCdQYW5lJywgJycpICsgJy1wYW5lJyA6ICcnKSxcclxuXHRcdCAgICBwYW5lID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgY2xhc3NOYW1lLCBjb250YWluZXIgfHwgdGhpcy5fbWFwUGFuZSk7XHJcblxyXG5cdFx0aWYgKG5hbWUpIHtcclxuXHRcdFx0dGhpcy5fcGFuZXNbbmFtZV0gPSBwYW5lO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHBhbmU7XHJcblx0fSxcclxuXHJcblxyXG5cdC8vIHB1YmxpYyBtZXRob2RzIGZvciBnZXR0aW5nIG1hcCBzdGF0ZVxyXG5cclxuXHRnZXRDZW50ZXI6IGZ1bmN0aW9uICgpIHsgLy8gKEJvb2xlYW4pIC0+IExhdExuZ1xyXG5cdFx0dGhpcy5fY2hlY2tJZkxvYWRlZCgpO1xyXG5cclxuXHRcdGlmICh0aGlzLl9sYXN0Q2VudGVyICYmICF0aGlzLl9tb3ZlZCgpKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLl9sYXN0Q2VudGVyO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMubGF5ZXJQb2ludFRvTGF0TG5nKHRoaXMuX2dldENlbnRlckxheWVyUG9pbnQoKSk7XHJcblx0fSxcclxuXHJcblx0Z2V0Wm9vbTogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3pvb207XHJcblx0fSxcclxuXHJcblx0Z2V0Qm91bmRzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgYm91bmRzID0gdGhpcy5nZXRQaXhlbEJvdW5kcygpLFxyXG5cdFx0ICAgIHN3ID0gdGhpcy51bnByb2plY3QoYm91bmRzLmdldEJvdHRvbUxlZnQoKSksXHJcblx0XHQgICAgbmUgPSB0aGlzLnVucHJvamVjdChib3VuZHMuZ2V0VG9wUmlnaHQoKSk7XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBMLkxhdExuZ0JvdW5kcyhzdywgbmUpO1xyXG5cdH0sXHJcblxyXG5cdGdldE1pblpvb206IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMubWluWm9vbSA9PT0gdW5kZWZpbmVkID8gdGhpcy5fbGF5ZXJzTWluWm9vbSB8fCAwIDogdGhpcy5vcHRpb25zLm1pblpvb207XHJcblx0fSxcclxuXHJcblx0Z2V0TWF4Wm9vbTogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMub3B0aW9ucy5tYXhab29tID09PSB1bmRlZmluZWQgP1xyXG5cdFx0XHQodGhpcy5fbGF5ZXJzTWF4Wm9vbSA9PT0gdW5kZWZpbmVkID8gSW5maW5pdHkgOiB0aGlzLl9sYXllcnNNYXhab29tKSA6XHJcblx0XHRcdHRoaXMub3B0aW9ucy5tYXhab29tO1xyXG5cdH0sXHJcblxyXG5cdGdldEJvdW5kc1pvb206IGZ1bmN0aW9uIChib3VuZHMsIGluc2lkZSwgcGFkZGluZykgeyAvLyAoTGF0TG5nQm91bmRzWywgQm9vbGVhbiwgUG9pbnRdKSAtPiBOdW1iZXJcclxuXHRcdGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKGJvdW5kcyk7XHJcblxyXG5cdFx0dmFyIHpvb20gPSB0aGlzLmdldE1pblpvb20oKSAtIChpbnNpZGUgPyAxIDogMCksXHJcblx0XHQgICAgbWF4Wm9vbSA9IHRoaXMuZ2V0TWF4Wm9vbSgpLFxyXG5cdFx0ICAgIHNpemUgPSB0aGlzLmdldFNpemUoKSxcclxuXHJcblx0XHQgICAgbncgPSBib3VuZHMuZ2V0Tm9ydGhXZXN0KCksXHJcblx0XHQgICAgc2UgPSBib3VuZHMuZ2V0U291dGhFYXN0KCksXHJcblxyXG5cdFx0ICAgIHpvb21Ob3RGb3VuZCA9IHRydWUsXHJcblx0XHQgICAgYm91bmRzU2l6ZTtcclxuXHJcblx0XHRwYWRkaW5nID0gTC5wb2ludChwYWRkaW5nIHx8IFswLCAwXSk7XHJcblxyXG5cdFx0ZG8ge1xyXG5cdFx0XHR6b29tKys7XHJcblx0XHRcdGJvdW5kc1NpemUgPSB0aGlzLnByb2plY3Qoc2UsIHpvb20pLnN1YnRyYWN0KHRoaXMucHJvamVjdChudywgem9vbSkpLmFkZChwYWRkaW5nKS5mbG9vcigpO1xyXG5cdFx0XHR6b29tTm90Rm91bmQgPSAhaW5zaWRlID8gc2l6ZS5jb250YWlucyhib3VuZHNTaXplKSA6IGJvdW5kc1NpemUueCA8IHNpemUueCB8fCBib3VuZHNTaXplLnkgPCBzaXplLnk7XHJcblxyXG5cdFx0fSB3aGlsZSAoem9vbU5vdEZvdW5kICYmIHpvb20gPD0gbWF4Wm9vbSk7XHJcblxyXG5cdFx0aWYgKHpvb21Ob3RGb3VuZCAmJiBpbnNpZGUpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGluc2lkZSA/IHpvb20gOiB6b29tIC0gMTtcclxuXHR9LFxyXG5cclxuXHRnZXRTaXplOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAoIXRoaXMuX3NpemUgfHwgdGhpcy5fc2l6ZUNoYW5nZWQpIHtcclxuXHRcdFx0dGhpcy5fc2l6ZSA9IG5ldyBMLlBvaW50KFxyXG5cdFx0XHRcdHRoaXMuX2NvbnRhaW5lci5jbGllbnRXaWR0aCxcclxuXHRcdFx0XHR0aGlzLl9jb250YWluZXIuY2xpZW50SGVpZ2h0KTtcclxuXHJcblx0XHRcdHRoaXMuX3NpemVDaGFuZ2VkID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5fc2l6ZS5jbG9uZSgpO1xyXG5cdH0sXHJcblxyXG5cdGdldFBpeGVsQm91bmRzOiBmdW5jdGlvbiAoY2VudGVyLCB6b29tKSB7XHJcblx0XHR2YXIgdG9wTGVmdFBvaW50ID0gdGhpcy5fZ2V0VG9wTGVmdFBvaW50KGNlbnRlciwgem9vbSk7XHJcblx0XHRyZXR1cm4gbmV3IEwuQm91bmRzKHRvcExlZnRQb2ludCwgdG9wTGVmdFBvaW50LmFkZCh0aGlzLmdldFNpemUoKSkpO1xyXG5cdH0sXHJcblxyXG5cdGdldFBpeGVsT3JpZ2luOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR0aGlzLl9jaGVja0lmTG9hZGVkKCk7XHJcblx0XHRyZXR1cm4gdGhpcy5fcGl4ZWxPcmlnaW47XHJcblx0fSxcclxuXHJcblx0Z2V0UGl4ZWxXb3JsZEJvdW5kczogZnVuY3Rpb24gKHpvb20pIHtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuY3JzLmdldFByb2plY3RlZEJvdW5kcyh6b29tID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFpvb20oKSA6IHpvb20pO1xyXG5cdH0sXHJcblxyXG5cdGdldFBhbmU6IGZ1bmN0aW9uIChwYW5lKSB7XHJcblx0XHRyZXR1cm4gdHlwZW9mIHBhbmUgPT09ICdzdHJpbmcnID8gdGhpcy5fcGFuZXNbcGFuZV0gOiBwYW5lO1xyXG5cdH0sXHJcblxyXG5cdGdldFBhbmVzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcGFuZXM7XHJcblx0fSxcclxuXHJcblx0Z2V0Q29udGFpbmVyOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xyXG5cdH0sXHJcblxyXG5cclxuXHQvLyBUT0RPIHJlcGxhY2Ugd2l0aCB1bml2ZXJzYWwgaW1wbGVtZW50YXRpb24gYWZ0ZXIgcmVmYWN0b3JpbmcgcHJvamVjdGlvbnNcclxuXHJcblx0Z2V0Wm9vbVNjYWxlOiBmdW5jdGlvbiAodG9ab29tLCBmcm9tWm9vbSkge1xyXG5cdFx0dmFyIGNycyA9IHRoaXMub3B0aW9ucy5jcnM7XHJcblx0XHRmcm9tWm9vbSA9IGZyb21ab29tID09PSB1bmRlZmluZWQgPyB0aGlzLl96b29tIDogZnJvbVpvb207XHJcblx0XHRyZXR1cm4gY3JzLnNjYWxlKHRvWm9vbSkgLyBjcnMuc2NhbGUoZnJvbVpvb20pO1xyXG5cdH0sXHJcblxyXG5cdGdldFNjYWxlWm9vbTogZnVuY3Rpb24gKHNjYWxlLCBmcm9tWm9vbSkge1xyXG5cdFx0dmFyIGNycyA9IHRoaXMub3B0aW9ucy5jcnM7XHJcblx0XHRmcm9tWm9vbSA9IGZyb21ab29tID09PSB1bmRlZmluZWQgPyB0aGlzLl96b29tIDogZnJvbVpvb207XHJcblx0XHRyZXR1cm4gY3JzLnpvb20oc2NhbGUgKiBjcnMuc2NhbGUoZnJvbVpvb20pKTtcclxuXHR9LFxyXG5cclxuXHQvLyBjb252ZXJzaW9uIG1ldGhvZHNcclxuXHJcblx0cHJvamVjdDogZnVuY3Rpb24gKGxhdGxuZywgem9vbSkgeyAvLyAoTGF0TG5nWywgTnVtYmVyXSkgLT4gUG9pbnRcclxuXHRcdHpvb20gPSB6b29tID09PSB1bmRlZmluZWQgPyB0aGlzLl96b29tIDogem9vbTtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuY3JzLmxhdExuZ1RvUG9pbnQoTC5sYXRMbmcobGF0bG5nKSwgem9vbSk7XHJcblx0fSxcclxuXHJcblx0dW5wcm9qZWN0OiBmdW5jdGlvbiAocG9pbnQsIHpvb20pIHsgLy8gKFBvaW50WywgTnVtYmVyXSkgLT4gTGF0TG5nXHJcblx0XHR6b29tID0gem9vbSA9PT0gdW5kZWZpbmVkID8gdGhpcy5fem9vbSA6IHpvb207XHJcblx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLmNycy5wb2ludFRvTGF0TG5nKEwucG9pbnQocG9pbnQpLCB6b29tKTtcclxuXHR9LFxyXG5cclxuXHRsYXllclBvaW50VG9MYXRMbmc6IGZ1bmN0aW9uIChwb2ludCkgeyAvLyAoUG9pbnQpXHJcblx0XHR2YXIgcHJvamVjdGVkUG9pbnQgPSBMLnBvaW50KHBvaW50KS5hZGQodGhpcy5nZXRQaXhlbE9yaWdpbigpKTtcclxuXHRcdHJldHVybiB0aGlzLnVucHJvamVjdChwcm9qZWN0ZWRQb2ludCk7XHJcblx0fSxcclxuXHJcblx0bGF0TG5nVG9MYXllclBvaW50OiBmdW5jdGlvbiAobGF0bG5nKSB7IC8vIChMYXRMbmcpXHJcblx0XHR2YXIgcHJvamVjdGVkUG9pbnQgPSB0aGlzLnByb2plY3QoTC5sYXRMbmcobGF0bG5nKSkuX3JvdW5kKCk7XHJcblx0XHRyZXR1cm4gcHJvamVjdGVkUG9pbnQuX3N1YnRyYWN0KHRoaXMuZ2V0UGl4ZWxPcmlnaW4oKSk7XHJcblx0fSxcclxuXHJcblx0d3JhcExhdExuZzogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0cmV0dXJuIHRoaXMub3B0aW9ucy5jcnMud3JhcExhdExuZyhMLmxhdExuZyhsYXRsbmcpKTtcclxuXHR9LFxyXG5cclxuXHRkaXN0YW5jZTogZnVuY3Rpb24gKGxhdGxuZzEsIGxhdGxuZzIpIHtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuY3JzLmRpc3RhbmNlKEwubGF0TG5nKGxhdGxuZzEpLCBMLmxhdExuZyhsYXRsbmcyKSk7XHJcblx0fSxcclxuXHJcblx0Y29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQ6IGZ1bmN0aW9uIChwb2ludCkgeyAvLyAoUG9pbnQpXHJcblx0XHRyZXR1cm4gTC5wb2ludChwb2ludCkuc3VidHJhY3QodGhpcy5fZ2V0TWFwUGFuZVBvcygpKTtcclxuXHR9LFxyXG5cclxuXHRsYXllclBvaW50VG9Db250YWluZXJQb2ludDogZnVuY3Rpb24gKHBvaW50KSB7IC8vIChQb2ludClcclxuXHRcdHJldHVybiBMLnBvaW50KHBvaW50KS5hZGQodGhpcy5fZ2V0TWFwUGFuZVBvcygpKTtcclxuXHR9LFxyXG5cclxuXHRjb250YWluZXJQb2ludFRvTGF0TG5nOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHZhciBsYXllclBvaW50ID0gdGhpcy5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChMLnBvaW50KHBvaW50KSk7XHJcblx0XHRyZXR1cm4gdGhpcy5sYXllclBvaW50VG9MYXRMbmcobGF5ZXJQb2ludCk7XHJcblx0fSxcclxuXHJcblx0bGF0TG5nVG9Db250YWluZXJQb2ludDogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0cmV0dXJuIHRoaXMubGF5ZXJQb2ludFRvQ29udGFpbmVyUG9pbnQodGhpcy5sYXRMbmdUb0xheWVyUG9pbnQoTC5sYXRMbmcobGF0bG5nKSkpO1xyXG5cdH0sXHJcblxyXG5cdG1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50OiBmdW5jdGlvbiAoZSkgeyAvLyAoTW91c2VFdmVudClcclxuXHRcdHJldHVybiBMLkRvbUV2ZW50LmdldE1vdXNlUG9zaXRpb24oZSwgdGhpcy5fY29udGFpbmVyKTtcclxuXHR9LFxyXG5cclxuXHRtb3VzZUV2ZW50VG9MYXllclBvaW50OiBmdW5jdGlvbiAoZSkgeyAvLyAoTW91c2VFdmVudClcclxuXHRcdHJldHVybiB0aGlzLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KHRoaXMubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZSkpO1xyXG5cdH0sXHJcblxyXG5cdG1vdXNlRXZlbnRUb0xhdExuZzogZnVuY3Rpb24gKGUpIHsgLy8gKE1vdXNlRXZlbnQpXHJcblx0XHRyZXR1cm4gdGhpcy5sYXllclBvaW50VG9MYXRMbmcodGhpcy5tb3VzZUV2ZW50VG9MYXllclBvaW50KGUpKTtcclxuXHR9LFxyXG5cclxuXHJcblx0Ly8gbWFwIGluaXRpYWxpemF0aW9uIG1ldGhvZHNcclxuXHJcblx0X2luaXRDb250YWluZXI6IGZ1bmN0aW9uIChpZCkge1xyXG5cdFx0dmFyIGNvbnRhaW5lciA9IHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5nZXQoaWQpO1xyXG5cclxuXHRcdGlmICghY29udGFpbmVyKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignTWFwIGNvbnRhaW5lciBub3QgZm91bmQuJyk7XHJcblx0XHR9IGVsc2UgaWYgKGNvbnRhaW5lci5fbGVhZmxldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ01hcCBjb250YWluZXIgaXMgYWxyZWFkeSBpbml0aWFsaXplZC4nKTtcclxuXHRcdH1cclxuXHJcblx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGNvbnRhaW5lciwgJ3Njcm9sbCcsIHRoaXMuX29uU2Nyb2xsLCB0aGlzKTtcclxuXHRcdGNvbnRhaW5lci5fbGVhZmxldCA9IHRydWU7XHJcblx0fSxcclxuXHJcblx0X2luaXRMYXlvdXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBjb250YWluZXIgPSB0aGlzLl9jb250YWluZXI7XHJcblxyXG5cdFx0dGhpcy5fZmFkZUFuaW1hdGVkID0gdGhpcy5vcHRpb25zLmZhZGVBbmltYXRpb24gJiYgTC5Ccm93c2VyLmFueTNkO1xyXG5cclxuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyhjb250YWluZXIsICdsZWFmbGV0LWNvbnRhaW5lcicgK1xyXG5cdFx0XHQoTC5Ccm93c2VyLnRvdWNoID8gJyBsZWFmbGV0LXRvdWNoJyA6ICcnKSArXHJcblx0XHRcdChMLkJyb3dzZXIucmV0aW5hID8gJyBsZWFmbGV0LXJldGluYScgOiAnJykgK1xyXG5cdFx0XHQoTC5Ccm93c2VyLmllbHQ5ID8gJyBsZWFmbGV0LW9sZGllJyA6ICcnKSArXHJcblx0XHRcdChMLkJyb3dzZXIuc2FmYXJpID8gJyBsZWFmbGV0LXNhZmFyaScgOiAnJykgK1xyXG5cdFx0XHQodGhpcy5fZmFkZUFuaW1hdGVkID8gJyBsZWFmbGV0LWZhZGUtYW5pbScgOiAnJykpO1xyXG5cclxuXHRcdHZhciBwb3NpdGlvbiA9IEwuRG9tVXRpbC5nZXRTdHlsZShjb250YWluZXIsICdwb3NpdGlvbicpO1xyXG5cclxuXHRcdGlmIChwb3NpdGlvbiAhPT0gJ2Fic29sdXRlJyAmJiBwb3NpdGlvbiAhPT0gJ3JlbGF0aXZlJyAmJiBwb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xyXG5cdFx0XHRjb250YWluZXIuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX2luaXRQYW5lcygpO1xyXG5cclxuXHRcdGlmICh0aGlzLl9pbml0Q29udHJvbFBvcykge1xyXG5cdFx0XHR0aGlzLl9pbml0Q29udHJvbFBvcygpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9pbml0UGFuZXM6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBwYW5lcyA9IHRoaXMuX3BhbmVzID0ge307XHJcblx0XHR0aGlzLl9wYW5lUmVuZGVyZXJzID0ge307XHJcblxyXG5cdFx0dGhpcy5fbWFwUGFuZSA9IHRoaXMuY3JlYXRlUGFuZSgnbWFwUGFuZScsIHRoaXMuX2NvbnRhaW5lcik7XHJcblx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fbWFwUGFuZSwgbmV3IEwuUG9pbnQoMCwgMCkpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlUGFuZSgndGlsZVBhbmUnKTtcclxuXHRcdHRoaXMuY3JlYXRlUGFuZSgnc2hhZG93UGFuZScpO1xyXG5cdFx0dGhpcy5jcmVhdGVQYW5lKCdvdmVybGF5UGFuZScpO1xyXG5cdFx0dGhpcy5jcmVhdGVQYW5lKCdtYXJrZXJQYW5lJyk7XHJcblx0XHR0aGlzLmNyZWF0ZVBhbmUoJ3BvcHVwUGFuZScpO1xyXG5cclxuXHRcdGlmICghdGhpcy5vcHRpb25zLm1hcmtlclpvb21BbmltYXRpb24pIHtcclxuXHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHBhbmVzLm1hcmtlclBhbmUsICdsZWFmbGV0LXpvb20taGlkZScpO1xyXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MocGFuZXMuc2hhZG93UGFuZSwgJ2xlYWZsZXQtem9vbS1oaWRlJyk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblxyXG5cdC8vIHByaXZhdGUgbWV0aG9kcyB0aGF0IG1vZGlmeSBtYXAgc3RhdGVcclxuXHJcblx0X3Jlc2V0VmlldzogZnVuY3Rpb24gKGNlbnRlciwgem9vbSkge1xyXG5cdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX21hcFBhbmUsIG5ldyBMLlBvaW50KDAsIDApKTtcclxuXHJcblx0XHR2YXIgbG9hZGluZyA9ICF0aGlzLl9sb2FkZWQ7XHJcblx0XHR0aGlzLl9sb2FkZWQgPSB0cnVlO1xyXG5cdFx0em9vbSA9IHRoaXMuX2xpbWl0Wm9vbSh6b29tKTtcclxuXHJcblx0XHR2YXIgem9vbUNoYW5nZWQgPSB0aGlzLl96b29tICE9PSB6b29tO1xyXG5cdFx0dGhpc1xyXG5cdFx0XHQuX21vdmVTdGFydCh6b29tQ2hhbmdlZClcclxuXHRcdFx0Ll9tb3ZlKGNlbnRlciwgem9vbSlcclxuXHRcdFx0Ll9tb3ZlRW5kKHpvb21DaGFuZ2VkKTtcclxuXHJcblx0XHR0aGlzLmZpcmUoJ3ZpZXdyZXNldCcpO1xyXG5cclxuXHRcdGlmIChsb2FkaW5nKSB7XHJcblx0XHRcdHRoaXMuZmlyZSgnbG9hZCcpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9tb3ZlU3RhcnQ6IGZ1bmN0aW9uICh6b29tQ2hhbmdlZCkge1xyXG5cdFx0aWYgKHpvb21DaGFuZ2VkKSB7XHJcblx0XHRcdHRoaXMuZmlyZSgnem9vbXN0YXJ0Jyk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5maXJlKCdtb3Zlc3RhcnQnKTtcclxuXHR9LFxyXG5cclxuXHRfbW92ZTogZnVuY3Rpb24gKGNlbnRlciwgem9vbSwgZGF0YSkge1xyXG5cdFx0aWYgKHpvb20gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR6b29tID0gdGhpcy5fem9vbTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgem9vbUNoYW5nZWQgPSB0aGlzLl96b29tICE9PSB6b29tO1xyXG5cclxuXHRcdHRoaXMuX3pvb20gPSB6b29tO1xyXG5cdFx0dGhpcy5fbGFzdENlbnRlciA9IGNlbnRlcjtcclxuXHRcdHRoaXMuX3BpeGVsT3JpZ2luID0gdGhpcy5fZ2V0TmV3UGl4ZWxPcmlnaW4oY2VudGVyKTtcclxuXHJcblx0XHRpZiAoem9vbUNoYW5nZWQpIHtcclxuXHRcdFx0dGhpcy5maXJlKCd6b29tJywgZGF0YSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5maXJlKCdtb3ZlJywgZGF0YSk7XHJcblx0fSxcclxuXHJcblx0X21vdmVFbmQ6IGZ1bmN0aW9uICh6b29tQ2hhbmdlZCkge1xyXG5cdFx0aWYgKHpvb21DaGFuZ2VkKSB7XHJcblx0XHRcdHRoaXMuZmlyZSgnem9vbWVuZCcpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuZmlyZSgnbW92ZWVuZCcpO1xyXG5cdH0sXHJcblxyXG5cdF9yYXdQYW5CeTogZnVuY3Rpb24gKG9mZnNldCkge1xyXG5cdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX21hcFBhbmUsIHRoaXMuX2dldE1hcFBhbmVQb3MoKS5zdWJ0cmFjdChvZmZzZXQpKTtcclxuXHR9LFxyXG5cclxuXHRfZ2V0Wm9vbVNwYW46IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldE1heFpvb20oKSAtIHRoaXMuZ2V0TWluWm9vbSgpO1xyXG5cdH0sXHJcblxyXG5cdF9wYW5JbnNpZGVNYXhCb3VuZHM6IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICghdGhpcy5fZW5mb3JjaW5nQm91bmRzKSB7XHJcblx0XHRcdHRoaXMucGFuSW5zaWRlQm91bmRzKHRoaXMub3B0aW9ucy5tYXhCb3VuZHMpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9jaGVja0lmTG9hZGVkOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAoIXRoaXMuX2xvYWRlZCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1NldCBtYXAgY2VudGVyIGFuZCB6b29tIGZpcnN0LicpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdC8vIERPTSBldmVudCBoYW5kbGluZ1xyXG5cclxuXHRfaW5pdEV2ZW50czogZnVuY3Rpb24gKHJlbW92ZSkge1xyXG5cdFx0aWYgKCFMLkRvbUV2ZW50KSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHRoaXMuX3RhcmdldHMgPSB7fTtcclxuXHRcdHRoaXMuX3RhcmdldHNbTC5zdGFtcCh0aGlzLl9jb250YWluZXIpXSA9IHRoaXM7XHJcblxyXG5cdFx0dmFyIG9uT2ZmID0gcmVtb3ZlID8gJ29mZicgOiAnb24nO1xyXG5cclxuXHRcdEwuRG9tRXZlbnRbb25PZmZdKHRoaXMuX2NvbnRhaW5lciwgJ2NsaWNrIGRibGNsaWNrIG1vdXNlZG93biBtb3VzZXVwICcgK1xyXG5cdFx0XHQnbW91c2VvdmVyIG1vdXNlb3V0IG1vdXNlbW92ZSBjb250ZXh0bWVudSBrZXlwcmVzcycsIHRoaXMuX2hhbmRsZURPTUV2ZW50LCB0aGlzKTtcclxuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnRyYWNrUmVzaXplKSB7XHJcblx0XHRcdEwuRG9tRXZlbnRbb25PZmZdKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMuX29uUmVzaXplLCB0aGlzKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoTC5Ccm93c2VyLmFueTNkICYmIHRoaXMub3B0aW9ucy50cmFuc2Zvcm0zRExpbWl0KSB7XHJcblx0XHRcdHRoaXNbb25PZmZdKCdtb3ZlZW5kJywgdGhpcy5fb25Nb3ZlRW5kKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRfb25SZXNpemU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdEwuVXRpbC5jYW5jZWxBbmltRnJhbWUodGhpcy5fcmVzaXplUmVxdWVzdCk7XHJcblx0XHR0aGlzLl9yZXNpemVSZXF1ZXN0ID0gTC5VdGlsLnJlcXVlc3RBbmltRnJhbWUoXHJcblx0XHQgICAgICAgIGZ1bmN0aW9uICgpIHsgdGhpcy5pbnZhbGlkYXRlU2l6ZSh7ZGVib3VuY2VNb3ZlZW5kOiB0cnVlfSk7IH0sIHRoaXMpO1xyXG5cdH0sXHJcblxyXG5cdF9vblNjcm9sbDogZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpcy5fY29udGFpbmVyLnNjcm9sbFRvcCAgPSAwO1xyXG5cdFx0dGhpcy5fY29udGFpbmVyLnNjcm9sbExlZnQgPSAwO1xyXG5cdH0sXHJcblxyXG5cdF9vbk1vdmVFbmQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBwb3MgPSB0aGlzLl9nZXRNYXBQYW5lUG9zKCk7XHJcblx0XHRpZiAoTWF0aC5tYXgoTWF0aC5hYnMocG9zLngpLCBNYXRoLmFicyhwb3MueSkpID49IHRoaXMub3B0aW9ucy50cmFuc2Zvcm0zRExpbWl0KSB7XHJcblx0XHRcdC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEyMDM4NzMgYnV0IFdlYmtpdCBhbHNvIGhhdmVcclxuXHRcdFx0Ly8gYSBwaXhlbCBvZmZzZXQgb24gdmVyeSBoaWdoIHZhbHVlcywgc2VlOiBodHRwOi8vanNmaWRkbGUubmV0L2RnNnI1aGhiL1xyXG5cdFx0XHR0aGlzLl9yZXNldFZpZXcodGhpcy5nZXRDZW50ZXIoKSwgdGhpcy5nZXRab29tKCkpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9maW5kRXZlbnRUYXJnZXRzOiBmdW5jdGlvbiAoZSwgdHlwZSkge1xyXG5cdFx0dmFyIHRhcmdldHMgPSBbXSxcclxuXHRcdCAgICB0YXJnZXQsXHJcblx0XHQgICAgaXNIb3ZlciA9IHR5cGUgPT09ICdtb3VzZW91dCcgfHwgdHlwZSA9PT0gJ21vdXNlb3ZlcicsXHJcblx0XHQgICAgc3JjID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xyXG5cclxuXHRcdHdoaWxlIChzcmMpIHtcclxuXHRcdFx0dGFyZ2V0ID0gdGhpcy5fdGFyZ2V0c1tMLnN0YW1wKHNyYyldO1xyXG5cdFx0XHRpZiAodGFyZ2V0ICYmIHRhcmdldC5saXN0ZW5zKHR5cGUsIHRydWUpKSB7XHJcblx0XHRcdFx0aWYgKGlzSG92ZXIgJiYgIUwuRG9tRXZlbnQuX2lzRXh0ZXJuYWxUYXJnZXQoc3JjLCBlKSkgeyBicmVhazsgfVxyXG5cdFx0XHRcdHRhcmdldHMucHVzaCh0YXJnZXQpO1xyXG5cdFx0XHRcdGlmIChpc0hvdmVyKSB7IGJyZWFrOyB9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHNyYyA9PT0gdGhpcy5fY29udGFpbmVyKSB7IGJyZWFrOyB9XHJcblx0XHRcdHNyYyA9IHNyYy5wYXJlbnROb2RlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCF0YXJnZXRzLmxlbmd0aCAmJiAhaXNIb3ZlciAmJiBMLkRvbUV2ZW50Ll9pc0V4dGVybmFsVGFyZ2V0KHNyYywgZSkpIHtcclxuXHRcdFx0dGFyZ2V0cyA9IFt0aGlzXTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0YXJnZXRzO1xyXG5cdH0sXHJcblxyXG5cdF9oYW5kbGVET01FdmVudDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGlmICghdGhpcy5fbG9hZGVkIHx8IEwuRG9tRXZlbnQuX3NraXBwZWQoZSkpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0Ly8gZmluZCB0aGUgbGF5ZXIgdGhlIGV2ZW50IGlzIHByb3BhZ2F0aW5nIGZyb20gYW5kIGl0cyBwYXJlbnRzXHJcblx0XHR2YXIgdHlwZSA9IGUudHlwZSA9PT0gJ2tleXByZXNzJyAmJiBlLmtleUNvZGUgPT09IDEzID8gJ2NsaWNrJyA6IGUudHlwZTtcclxuXHJcblx0XHRpZiAoZS50eXBlID09PSAnY2xpY2snKSB7XHJcblx0XHRcdC8vIEZpcmUgYSBzeW50aGV0aWMgJ3ByZWNsaWNrJyBldmVudCB3aGljaCBwcm9wYWdhdGVzIHVwIChtYWlubHkgZm9yIGNsb3NpbmcgcG9wdXBzKS5cclxuXHRcdFx0dmFyIHN5bnRoID0gTC5VdGlsLmV4dGVuZCh7fSwgZSk7XHJcblx0XHRcdHN5bnRoLnR5cGUgPSAncHJlY2xpY2snO1xyXG5cdFx0XHR0aGlzLl9oYW5kbGVET01FdmVudChzeW50aCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdtb3VzZWRvd24nKSB7XHJcblx0XHRcdC8vIHByZXZlbnRzIG91dGxpbmUgd2hlbiBjbGlja2luZyBvbiBrZXlib2FyZC1mb2N1c2FibGUgZWxlbWVudFxyXG5cdFx0XHRMLkRvbVV0aWwucHJldmVudE91dGxpbmUoZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9maXJlRE9NRXZlbnQoZSwgdHlwZSk7XHJcblx0fSxcclxuXHJcblx0X2ZpcmVET01FdmVudDogZnVuY3Rpb24gKGUsIHR5cGUsIHRhcmdldHMpIHtcclxuXHJcblx0XHRpZiAoZS5fc3RvcHBlZCkgeyByZXR1cm47IH1cclxuXHJcblx0XHR0YXJnZXRzID0gKHRhcmdldHMgfHwgW10pLmNvbmNhdCh0aGlzLl9maW5kRXZlbnRUYXJnZXRzKGUsIHR5cGUpKTtcclxuXHJcblx0XHRpZiAoIXRhcmdldHMubGVuZ3RoKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHZhciB0YXJnZXQgPSB0YXJnZXRzWzBdO1xyXG5cdFx0aWYgKHR5cGUgPT09ICdjb250ZXh0bWVudScgJiYgdGFyZ2V0Lmxpc3RlbnModHlwZSwgdHJ1ZSkpIHtcclxuXHRcdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBwcmV2ZW50cyBmaXJpbmcgY2xpY2sgYWZ0ZXIgeW91IGp1c3QgZHJhZ2dlZCBhbiBvYmplY3RcclxuXHRcdGlmICgoZS50eXBlID09PSAnY2xpY2snIHx8IGUudHlwZSA9PT0gJ3ByZWNsaWNrJykgJiYgIWUuX3NpbXVsYXRlZCAmJiB0aGlzLl9kcmFnZ2FibGVNb3ZlZCh0YXJnZXQpKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHZhciBkYXRhID0ge1xyXG5cdFx0XHRvcmlnaW5hbEV2ZW50OiBlXHJcblx0XHR9O1xyXG5cclxuXHRcdGlmIChlLnR5cGUgIT09ICdrZXlwcmVzcycpIHtcclxuXHRcdFx0dmFyIGlzTWFya2VyID0gdGFyZ2V0IGluc3RhbmNlb2YgTC5NYXJrZXI7XHJcblx0XHRcdGRhdGEuY29udGFpbmVyUG9pbnQgPSBpc01hcmtlciA/XHJcblx0XHRcdFx0XHR0aGlzLmxhdExuZ1RvQ29udGFpbmVyUG9pbnQodGFyZ2V0LmdldExhdExuZygpKSA6IHRoaXMubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZSk7XHJcblx0XHRcdGRhdGEubGF5ZXJQb2ludCA9IHRoaXMuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoZGF0YS5jb250YWluZXJQb2ludCk7XHJcblx0XHRcdGRhdGEubGF0bG5nID0gaXNNYXJrZXIgPyB0YXJnZXQuZ2V0TGF0TG5nKCkgOiB0aGlzLmxheWVyUG9pbnRUb0xhdExuZyhkYXRhLmxheWVyUG9pbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGFyZ2V0cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0YXJnZXRzW2ldLmZpcmUodHlwZSwgZGF0YSwgdHJ1ZSk7XHJcblx0XHRcdGlmIChkYXRhLm9yaWdpbmFsRXZlbnQuX3N0b3BwZWQgfHxcclxuXHRcdFx0XHQodGFyZ2V0c1tpXS5vcHRpb25zLm5vbkJ1YmJsaW5nRXZlbnRzICYmIEwuVXRpbC5pbmRleE9mKHRhcmdldHNbaV0ub3B0aW9ucy5ub25CdWJibGluZ0V2ZW50cywgdHlwZSkgIT09IC0xKSkgeyByZXR1cm47IH1cclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRfZHJhZ2dhYmxlTW92ZWQ6IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdG9iaiA9IG9iai5vcHRpb25zLmRyYWdnYWJsZSA/IG9iaiA6IHRoaXM7XHJcblx0XHRyZXR1cm4gKG9iai5kcmFnZ2luZyAmJiBvYmouZHJhZ2dpbmcubW92ZWQoKSkgfHwgKHRoaXMuYm94Wm9vbSAmJiB0aGlzLmJveFpvb20ubW92ZWQoKSk7XHJcblx0fSxcclxuXHJcblx0X2NsZWFySGFuZGxlcnM6IGZ1bmN0aW9uICgpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9oYW5kbGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHR0aGlzLl9oYW5kbGVyc1tpXS5kaXNhYmxlKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0d2hlblJlYWR5OiBmdW5jdGlvbiAoY2FsbGJhY2ssIGNvbnRleHQpIHtcclxuXHRcdGlmICh0aGlzLl9sb2FkZWQpIHtcclxuXHRcdFx0Y2FsbGJhY2suY2FsbChjb250ZXh0IHx8IHRoaXMsIHt0YXJnZXQ6IHRoaXN9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMub24oJ2xvYWQnLCBjYWxsYmFjaywgY29udGV4dCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHJcblx0Ly8gcHJpdmF0ZSBtZXRob2RzIGZvciBnZXR0aW5nIG1hcCBzdGF0ZVxyXG5cclxuXHRfZ2V0TWFwUGFuZVBvczogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIEwuRG9tVXRpbC5nZXRQb3NpdGlvbih0aGlzLl9tYXBQYW5lKSB8fCBuZXcgTC5Qb2ludCgwLCAwKTtcclxuXHR9LFxyXG5cclxuXHRfbW92ZWQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBwb3MgPSB0aGlzLl9nZXRNYXBQYW5lUG9zKCk7XHJcblx0XHRyZXR1cm4gcG9zICYmICFwb3MuZXF1YWxzKFswLCAwXSk7XHJcblx0fSxcclxuXHJcblx0X2dldFRvcExlZnRQb2ludDogZnVuY3Rpb24gKGNlbnRlciwgem9vbSkge1xyXG5cdFx0dmFyIHBpeGVsT3JpZ2luID0gY2VudGVyICYmIHpvb20gIT09IHVuZGVmaW5lZCA/XHJcblx0XHRcdHRoaXMuX2dldE5ld1BpeGVsT3JpZ2luKGNlbnRlciwgem9vbSkgOlxyXG5cdFx0XHR0aGlzLmdldFBpeGVsT3JpZ2luKCk7XHJcblx0XHRyZXR1cm4gcGl4ZWxPcmlnaW4uc3VidHJhY3QodGhpcy5fZ2V0TWFwUGFuZVBvcygpKTtcclxuXHR9LFxyXG5cclxuXHRfZ2V0TmV3UGl4ZWxPcmlnaW46IGZ1bmN0aW9uIChjZW50ZXIsIHpvb20pIHtcclxuXHRcdHZhciB2aWV3SGFsZiA9IHRoaXMuZ2V0U2l6ZSgpLl9kaXZpZGVCeSgyKTtcclxuXHRcdHJldHVybiB0aGlzLnByb2plY3QoY2VudGVyLCB6b29tKS5fc3VidHJhY3Qodmlld0hhbGYpLl9hZGQodGhpcy5fZ2V0TWFwUGFuZVBvcygpKS5fcm91bmQoKTtcclxuXHR9LFxyXG5cclxuXHRfbGF0TG5nVG9OZXdMYXllclBvaW50OiBmdW5jdGlvbiAobGF0bG5nLCB6b29tLCBjZW50ZXIpIHtcclxuXHRcdHZhciB0b3BMZWZ0ID0gdGhpcy5fZ2V0TmV3UGl4ZWxPcmlnaW4oY2VudGVyLCB6b29tKTtcclxuXHRcdHJldHVybiB0aGlzLnByb2plY3QobGF0bG5nLCB6b29tKS5fc3VidHJhY3QodG9wTGVmdCk7XHJcblx0fSxcclxuXHJcblx0Ly8gbGF5ZXIgcG9pbnQgb2YgdGhlIGN1cnJlbnQgY2VudGVyXHJcblx0X2dldENlbnRlckxheWVyUG9pbnQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KHRoaXMuZ2V0U2l6ZSgpLl9kaXZpZGVCeSgyKSk7XHJcblx0fSxcclxuXHJcblx0Ly8gb2Zmc2V0IG9mIHRoZSBzcGVjaWZpZWQgcGxhY2UgdG8gdGhlIGN1cnJlbnQgY2VudGVyIGluIHBpeGVsc1xyXG5cdF9nZXRDZW50ZXJPZmZzZXQ6IGZ1bmN0aW9uIChsYXRsbmcpIHtcclxuXHRcdHJldHVybiB0aGlzLmxhdExuZ1RvTGF5ZXJQb2ludChsYXRsbmcpLnN1YnRyYWN0KHRoaXMuX2dldENlbnRlckxheWVyUG9pbnQoKSk7XHJcblx0fSxcclxuXHJcblx0Ly8gYWRqdXN0IGNlbnRlciBmb3IgdmlldyB0byBnZXQgaW5zaWRlIGJvdW5kc1xyXG5cdF9saW1pdENlbnRlcjogZnVuY3Rpb24gKGNlbnRlciwgem9vbSwgYm91bmRzKSB7XHJcblxyXG5cdFx0aWYgKCFib3VuZHMpIHsgcmV0dXJuIGNlbnRlcjsgfVxyXG5cclxuXHRcdHZhciBjZW50ZXJQb2ludCA9IHRoaXMucHJvamVjdChjZW50ZXIsIHpvb20pLFxyXG5cdFx0ICAgIHZpZXdIYWxmID0gdGhpcy5nZXRTaXplKCkuZGl2aWRlQnkoMiksXHJcblx0XHQgICAgdmlld0JvdW5kcyA9IG5ldyBMLkJvdW5kcyhjZW50ZXJQb2ludC5zdWJ0cmFjdCh2aWV3SGFsZiksIGNlbnRlclBvaW50LmFkZCh2aWV3SGFsZikpLFxyXG5cdFx0ICAgIG9mZnNldCA9IHRoaXMuX2dldEJvdW5kc09mZnNldCh2aWV3Qm91bmRzLCBib3VuZHMsIHpvb20pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLnVucHJvamVjdChjZW50ZXJQb2ludC5hZGQob2Zmc2V0KSwgem9vbSk7XHJcblx0fSxcclxuXHJcblx0Ly8gYWRqdXN0IG9mZnNldCBmb3IgdmlldyB0byBnZXQgaW5zaWRlIGJvdW5kc1xyXG5cdF9saW1pdE9mZnNldDogZnVuY3Rpb24gKG9mZnNldCwgYm91bmRzKSB7XHJcblx0XHRpZiAoIWJvdW5kcykgeyByZXR1cm4gb2Zmc2V0OyB9XHJcblxyXG5cdFx0dmFyIHZpZXdCb3VuZHMgPSB0aGlzLmdldFBpeGVsQm91bmRzKCksXHJcblx0XHQgICAgbmV3Qm91bmRzID0gbmV3IEwuQm91bmRzKHZpZXdCb3VuZHMubWluLmFkZChvZmZzZXQpLCB2aWV3Qm91bmRzLm1heC5hZGQob2Zmc2V0KSk7XHJcblxyXG5cdFx0cmV0dXJuIG9mZnNldC5hZGQodGhpcy5fZ2V0Qm91bmRzT2Zmc2V0KG5ld0JvdW5kcywgYm91bmRzKSk7XHJcblx0fSxcclxuXHJcblx0Ly8gcmV0dXJucyBvZmZzZXQgbmVlZGVkIGZvciBweEJvdW5kcyB0byBnZXQgaW5zaWRlIG1heEJvdW5kcyBhdCBhIHNwZWNpZmllZCB6b29tXHJcblx0X2dldEJvdW5kc09mZnNldDogZnVuY3Rpb24gKHB4Qm91bmRzLCBtYXhCb3VuZHMsIHpvb20pIHtcclxuXHRcdHZhciBud09mZnNldCA9IHRoaXMucHJvamVjdChtYXhCb3VuZHMuZ2V0Tm9ydGhXZXN0KCksIHpvb20pLnN1YnRyYWN0KHB4Qm91bmRzLm1pbiksXHJcblx0XHQgICAgc2VPZmZzZXQgPSB0aGlzLnByb2plY3QobWF4Qm91bmRzLmdldFNvdXRoRWFzdCgpLCB6b29tKS5zdWJ0cmFjdChweEJvdW5kcy5tYXgpLFxyXG5cclxuXHRcdCAgICBkeCA9IHRoaXMuX3JlYm91bmQobndPZmZzZXQueCwgLXNlT2Zmc2V0LngpLFxyXG5cdFx0ICAgIGR5ID0gdGhpcy5fcmVib3VuZChud09mZnNldC55LCAtc2VPZmZzZXQueSk7XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBMLlBvaW50KGR4LCBkeSk7XHJcblx0fSxcclxuXHJcblx0X3JlYm91bmQ6IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xyXG5cdFx0cmV0dXJuIGxlZnQgKyByaWdodCA+IDAgP1xyXG5cdFx0XHRNYXRoLnJvdW5kKGxlZnQgLSByaWdodCkgLyAyIDpcclxuXHRcdFx0TWF0aC5tYXgoMCwgTWF0aC5jZWlsKGxlZnQpKSAtIE1hdGgubWF4KDAsIE1hdGguZmxvb3IocmlnaHQpKTtcclxuXHR9LFxyXG5cclxuXHRfbGltaXRab29tOiBmdW5jdGlvbiAoem9vbSkge1xyXG5cdFx0dmFyIG1pbiA9IHRoaXMuZ2V0TWluWm9vbSgpLFxyXG5cdFx0ICAgIG1heCA9IHRoaXMuZ2V0TWF4Wm9vbSgpO1xyXG5cdFx0aWYgKCFMLkJyb3dzZXIuYW55M2QpIHsgem9vbSA9IE1hdGgucm91bmQoem9vbSk7IH1cclxuXHJcblx0XHRyZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHpvb20pKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuTC5tYXAgPSBmdW5jdGlvbiAoaWQsIG9wdGlvbnMpIHtcclxuXHRyZXR1cm4gbmV3IEwuTWFwKGlkLCBvcHRpb25zKTtcclxufTtcclxuXG5cblxuXG5MLkxheWVyID0gTC5FdmVudGVkLmV4dGVuZCh7XG5cblx0b3B0aW9uczoge1xuXHRcdHBhbmU6ICdvdmVybGF5UGFuZScsXG5cdFx0bm9uQnViYmxpbmdFdmVudHM6IFtdICAvLyBBcnJheSBvZiBldmVudHMgdGhhdCBzaG91bGQgbm90IGJlIGJ1YmJsZWQgdG8gRE9NIHBhcmVudHMgKGxpa2UgdGhlIG1hcClcblx0fSxcblxuXHRhZGRUbzogZnVuY3Rpb24gKG1hcCkge1xuXHRcdG1hcC5hZGRMYXllcih0aGlzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZW1vdmU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5yZW1vdmVGcm9tKHRoaXMuX21hcCB8fCB0aGlzLl9tYXBUb0FkZCk7XG5cdH0sXG5cblx0cmVtb3ZlRnJvbTogZnVuY3Rpb24gKG9iaikge1xuXHRcdGlmIChvYmopIHtcblx0XHRcdG9iai5yZW1vdmVMYXllcih0aGlzKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Z2V0UGFuZTogZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5fbWFwLmdldFBhbmUobmFtZSA/ICh0aGlzLm9wdGlvbnNbbmFtZV0gfHwgbmFtZSkgOiB0aGlzLm9wdGlvbnMucGFuZSk7XG5cdH0sXG5cblx0YWRkSW50ZXJhY3RpdmVUYXJnZXQ6IGZ1bmN0aW9uICh0YXJnZXRFbCkge1xuXHRcdHRoaXMuX21hcC5fdGFyZ2V0c1tMLnN0YW1wKHRhcmdldEVsKV0gPSB0aGlzO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHJlbW92ZUludGVyYWN0aXZlVGFyZ2V0OiBmdW5jdGlvbiAodGFyZ2V0RWwpIHtcblx0XHRkZWxldGUgdGhpcy5fbWFwLl90YXJnZXRzW0wuc3RhbXAodGFyZ2V0RWwpXTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfbGF5ZXJBZGQ6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIG1hcCA9IGUudGFyZ2V0O1xuXG5cdFx0Ly8gY2hlY2sgaW4gY2FzZSBsYXllciBnZXRzIGFkZGVkIGFuZCB0aGVuIHJlbW92ZWQgYmVmb3JlIHRoZSBtYXAgaXMgcmVhZHlcblx0XHRpZiAoIW1hcC5oYXNMYXllcih0aGlzKSkgeyByZXR1cm47IH1cblxuXHRcdHRoaXMuX21hcCA9IG1hcDtcblx0XHR0aGlzLl96b29tQW5pbWF0ZWQgPSBtYXAuX3pvb21BbmltYXRlZDtcblxuXHRcdGlmICh0aGlzLmdldEV2ZW50cykge1xuXHRcdFx0bWFwLm9uKHRoaXMuZ2V0RXZlbnRzKCksIHRoaXMpO1xuXHRcdH1cblxuXHRcdHRoaXMub25BZGQobWFwKTtcblxuXHRcdGlmICh0aGlzLmdldEF0dHJpYnV0aW9uICYmIHRoaXMuX21hcC5hdHRyaWJ1dGlvbkNvbnRyb2wpIHtcblx0XHRcdHRoaXMuX21hcC5hdHRyaWJ1dGlvbkNvbnRyb2wuYWRkQXR0cmlidXRpb24odGhpcy5nZXRBdHRyaWJ1dGlvbigpKTtcblx0XHR9XG5cblx0XHR0aGlzLmZpcmUoJ2FkZCcpO1xuXHRcdG1hcC5maXJlKCdsYXllcmFkZCcsIHtsYXllcjogdGhpc30pO1xuXHR9XG59KTtcblxuXG5MLk1hcC5pbmNsdWRlKHtcblx0YWRkTGF5ZXI6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHZhciBpZCA9IEwuc3RhbXAobGF5ZXIpO1xuXHRcdGlmICh0aGlzLl9sYXllcnNbaWRdKSB7IHJldHVybiBsYXllcjsgfVxuXHRcdHRoaXMuX2xheWVyc1tpZF0gPSBsYXllcjtcblxuXHRcdGxheWVyLl9tYXBUb0FkZCA9IHRoaXM7XG5cblx0XHRpZiAobGF5ZXIuYmVmb3JlQWRkKSB7XG5cdFx0XHRsYXllci5iZWZvcmVBZGQodGhpcyk7XG5cdFx0fVxuXG5cdFx0dGhpcy53aGVuUmVhZHkobGF5ZXIuX2xheWVyQWRkLCBsYXllcik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZW1vdmVMYXllcjogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0dmFyIGlkID0gTC5zdGFtcChsYXllcik7XG5cblx0XHRpZiAoIXRoaXMuX2xheWVyc1tpZF0pIHsgcmV0dXJuIHRoaXM7IH1cblxuXHRcdGlmICh0aGlzLl9sb2FkZWQpIHtcblx0XHRcdGxheWVyLm9uUmVtb3ZlKHRoaXMpO1xuXHRcdH1cblxuXHRcdGlmIChsYXllci5nZXRBdHRyaWJ1dGlvbiAmJiB0aGlzLmF0dHJpYnV0aW9uQ29udHJvbCkge1xuXHRcdFx0dGhpcy5hdHRyaWJ1dGlvbkNvbnRyb2wucmVtb3ZlQXR0cmlidXRpb24obGF5ZXIuZ2V0QXR0cmlidXRpb24oKSk7XG5cdFx0fVxuXG5cdFx0aWYgKGxheWVyLmdldEV2ZW50cykge1xuXHRcdFx0dGhpcy5vZmYobGF5ZXIuZ2V0RXZlbnRzKCksIGxheWVyKTtcblx0XHR9XG5cblx0XHRkZWxldGUgdGhpcy5fbGF5ZXJzW2lkXTtcblxuXHRcdGlmICh0aGlzLl9sb2FkZWQpIHtcblx0XHRcdHRoaXMuZmlyZSgnbGF5ZXJyZW1vdmUnLCB7bGF5ZXI6IGxheWVyfSk7XG5cdFx0XHRsYXllci5maXJlKCdyZW1vdmUnKTtcblx0XHR9XG5cblx0XHRsYXllci5fbWFwID0gbGF5ZXIuX21hcFRvQWRkID0gbnVsbDtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGhhc0xheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHRyZXR1cm4gISFsYXllciAmJiAoTC5zdGFtcChsYXllcikgaW4gdGhpcy5fbGF5ZXJzKTtcblx0fSxcblxuXHRlYWNoTGF5ZXI6IGZ1bmN0aW9uIChtZXRob2QsIGNvbnRleHQpIHtcblx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2xheWVycykge1xuXHRcdFx0bWV0aG9kLmNhbGwoY29udGV4dCwgdGhpcy5fbGF5ZXJzW2ldKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2FkZExheWVyczogZnVuY3Rpb24gKGxheWVycykge1xuXHRcdGxheWVycyA9IGxheWVycyA/IChMLlV0aWwuaXNBcnJheShsYXllcnMpID8gbGF5ZXJzIDogW2xheWVyc10pIDogW107XG5cblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gbGF5ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHR0aGlzLmFkZExheWVyKGxheWVyc1tpXSk7XG5cdFx0fVxuXHR9LFxuXG5cdF9hZGRab29tTGltaXQ6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdGlmIChpc05hTihsYXllci5vcHRpb25zLm1heFpvb20pIHx8ICFpc05hTihsYXllci5vcHRpb25zLm1pblpvb20pKSB7XG5cdFx0XHR0aGlzLl96b29tQm91bmRMYXllcnNbTC5zdGFtcChsYXllcildID0gbGF5ZXI7XG5cdFx0XHR0aGlzLl91cGRhdGVab29tTGV2ZWxzKCk7XG5cdFx0fVxuXHR9LFxuXG5cdF9yZW1vdmVab29tTGltaXQ6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHZhciBpZCA9IEwuc3RhbXAobGF5ZXIpO1xuXG5cdFx0aWYgKHRoaXMuX3pvb21Cb3VuZExheWVyc1tpZF0pIHtcblx0XHRcdGRlbGV0ZSB0aGlzLl96b29tQm91bmRMYXllcnNbaWRdO1xuXHRcdFx0dGhpcy5fdXBkYXRlWm9vbUxldmVscygpO1xuXHRcdH1cblx0fSxcblxuXHRfdXBkYXRlWm9vbUxldmVsczogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBtaW5ab29tID0gSW5maW5pdHksXG5cdFx0ICAgIG1heFpvb20gPSAtSW5maW5pdHksXG5cdFx0ICAgIG9sZFpvb21TcGFuID0gdGhpcy5fZ2V0Wm9vbVNwYW4oKTtcblxuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5fem9vbUJvdW5kTGF5ZXJzKSB7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMuX3pvb21Cb3VuZExheWVyc1tpXS5vcHRpb25zO1xuXG5cdFx0XHRtaW5ab29tID0gb3B0aW9ucy5taW5ab29tID09PSB1bmRlZmluZWQgPyBtaW5ab29tIDogTWF0aC5taW4obWluWm9vbSwgb3B0aW9ucy5taW5ab29tKTtcblx0XHRcdG1heFpvb20gPSBvcHRpb25zLm1heFpvb20gPT09IHVuZGVmaW5lZCA/IG1heFpvb20gOiBNYXRoLm1heChtYXhab29tLCBvcHRpb25zLm1heFpvb20pO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xheWVyc01heFpvb20gPSBtYXhab29tID09PSAtSW5maW5pdHkgPyB1bmRlZmluZWQgOiBtYXhab29tO1xuXHRcdHRoaXMuX2xheWVyc01pblpvb20gPSBtaW5ab29tID09PSBJbmZpbml0eSA/IHVuZGVmaW5lZCA6IG1pblpvb207XG5cblx0XHRpZiAob2xkWm9vbVNwYW4gIT09IHRoaXMuX2dldFpvb21TcGFuKCkpIHtcblx0XHRcdHRoaXMuZmlyZSgnem9vbWxldmVsc2NoYW5nZScpO1xuXHRcdH1cblx0fVxufSk7XG5cblxuXG4vKlxyXG4gKiBNZXJjYXRvciBwcm9qZWN0aW9uIHRoYXQgdGFrZXMgaW50byBhY2NvdW50IHRoYXQgdGhlIEVhcnRoIGlzIG5vdCBhIHBlcmZlY3Qgc3BoZXJlLlxyXG4gKiBMZXNzIHBvcHVsYXIgdGhhbiBzcGhlcmljYWwgbWVyY2F0b3I7IHVzZWQgYnkgcHJvamVjdGlvbnMgbGlrZSBFUFNHOjMzOTUuXHJcbiAqL1xyXG5cclxuTC5Qcm9qZWN0aW9uLk1lcmNhdG9yID0ge1xyXG5cdFI6IDYzNzgxMzcsXHJcblx0Ul9NSU5PUjogNjM1Njc1Mi4zMTQyNDUxNzksXHJcblxyXG5cdGJvdW5kczogTC5ib3VuZHMoWy0yMDAzNzUwOC4zNDI3OSwgLTE1NDk2NTcwLjczOTcyXSwgWzIwMDM3NTA4LjM0Mjc5LCAxODc2NDY1Ni4yMzEzOF0pLFxyXG5cclxuXHRwcm9qZWN0OiBmdW5jdGlvbiAobGF0bG5nKSB7XHJcblx0XHR2YXIgZCA9IE1hdGguUEkgLyAxODAsXHJcblx0XHQgICAgciA9IHRoaXMuUixcclxuXHRcdCAgICB5ID0gbGF0bG5nLmxhdCAqIGQsXHJcblx0XHQgICAgdG1wID0gdGhpcy5SX01JTk9SIC8gcixcclxuXHRcdCAgICBlID0gTWF0aC5zcXJ0KDEgLSB0bXAgKiB0bXApLFxyXG5cdFx0ICAgIGNvbiA9IGUgKiBNYXRoLnNpbih5KTtcclxuXHJcblx0XHR2YXIgdHMgPSBNYXRoLnRhbihNYXRoLlBJIC8gNCAtIHkgLyAyKSAvIE1hdGgucG93KCgxIC0gY29uKSAvICgxICsgY29uKSwgZSAvIDIpO1xyXG5cdFx0eSA9IC1yICogTWF0aC5sb2coTWF0aC5tYXgodHMsIDFFLTEwKSk7XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBMLlBvaW50KGxhdGxuZy5sbmcgKiBkICogciwgeSk7XHJcblx0fSxcclxuXHJcblx0dW5wcm9qZWN0OiBmdW5jdGlvbiAocG9pbnQpIHtcclxuXHRcdHZhciBkID0gMTgwIC8gTWF0aC5QSSxcclxuXHRcdCAgICByID0gdGhpcy5SLFxyXG5cdFx0ICAgIHRtcCA9IHRoaXMuUl9NSU5PUiAvIHIsXHJcblx0XHQgICAgZSA9IE1hdGguc3FydCgxIC0gdG1wICogdG1wKSxcclxuXHRcdCAgICB0cyA9IE1hdGguZXhwKC1wb2ludC55IC8gciksXHJcblx0XHQgICAgcGhpID0gTWF0aC5QSSAvIDIgLSAyICogTWF0aC5hdGFuKHRzKTtcclxuXHJcblx0XHRmb3IgKHZhciBpID0gMCwgZHBoaSA9IDAuMSwgY29uOyBpIDwgMTUgJiYgTWF0aC5hYnMoZHBoaSkgPiAxZS03OyBpKyspIHtcclxuXHRcdFx0Y29uID0gZSAqIE1hdGguc2luKHBoaSk7XHJcblx0XHRcdGNvbiA9IE1hdGgucG93KCgxIC0gY29uKSAvICgxICsgY29uKSwgZSAvIDIpO1xyXG5cdFx0XHRkcGhpID0gTWF0aC5QSSAvIDIgLSAyICogTWF0aC5hdGFuKHRzICogY29uKSAtIHBoaTtcclxuXHRcdFx0cGhpICs9IGRwaGk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBMLkxhdExuZyhwaGkgKiBkLCBwb2ludC54ICogZCAvIHIpO1xyXG5cdH1cclxufTtcclxuXG5cblxuLypcclxuICogTC5DUlMuRVBTRzM4NTcgKFdvcmxkIE1lcmNhdG9yKSBDUlMgaW1wbGVtZW50YXRpb24uXHJcbiAqL1xyXG5cclxuTC5DUlMuRVBTRzMzOTUgPSBMLmV4dGVuZCh7fSwgTC5DUlMuRWFydGgsIHtcclxuXHRjb2RlOiAnRVBTRzozMzk1JyxcclxuXHRwcm9qZWN0aW9uOiBMLlByb2plY3Rpb24uTWVyY2F0b3IsXHJcblxyXG5cdHRyYW5zZm9ybWF0aW9uOiAoZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIHNjYWxlID0gMC41IC8gKE1hdGguUEkgKiBMLlByb2plY3Rpb24uTWVyY2F0b3IuUik7XHJcblx0XHRyZXR1cm4gbmV3IEwuVHJhbnNmb3JtYXRpb24oc2NhbGUsIDAuNSwgLXNjYWxlLCAwLjUpO1xyXG5cdH0oKSlcclxufSk7XHJcblxuXG5cbi8qXG4gKiBMLkdyaWRMYXllciBpcyB1c2VkIGFzIGJhc2UgY2xhc3MgZm9yIGdyaWQtbGlrZSBsYXllcnMgbGlrZSBUaWxlTGF5ZXIuXG4gKi9cblxuTC5HcmlkTGF5ZXIgPSBMLkxheWVyLmV4dGVuZCh7XG5cblx0b3B0aW9uczoge1xuXHRcdHBhbmU6ICd0aWxlUGFuZScsXG5cblx0XHR0aWxlU2l6ZTogMjU2LFxuXHRcdG9wYWNpdHk6IDEsXG5cdFx0ekluZGV4OiAxLFxuXG5cdFx0dXBkYXRlV2hlbklkbGU6IEwuQnJvd3Nlci5tb2JpbGUsXG5cdFx0dXBkYXRlSW50ZXJ2YWw6IDIwMCxcblxuXHRcdGF0dHJpYnV0aW9uOiBudWxsLFxuXHRcdGJvdW5kczogbnVsbCxcblxuXHRcdG1pblpvb206IDBcblx0XHQvLyBtYXhab29tOiA8TnVtYmVyPlxuXHRcdC8vIG5vV3JhcDogZmFsc2Vcblx0fSxcblxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdH0sXG5cblx0b25BZGQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9pbml0Q29udGFpbmVyKCk7XG5cblx0XHR0aGlzLl9sZXZlbHMgPSB7fTtcblx0XHR0aGlzLl90aWxlcyA9IHt9O1xuXG5cdFx0dGhpcy5fcmVzZXRWaWV3KCk7XG5cdFx0dGhpcy5fdXBkYXRlKCk7XG5cdH0sXG5cblx0YmVmb3JlQWRkOiBmdW5jdGlvbiAobWFwKSB7XG5cdFx0bWFwLl9hZGRab29tTGltaXQodGhpcyk7XG5cdH0sXG5cblx0b25SZW1vdmU6IGZ1bmN0aW9uIChtYXApIHtcblx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2NvbnRhaW5lcik7XG5cdFx0bWFwLl9yZW1vdmVab29tTGltaXQodGhpcyk7XG5cdFx0dGhpcy5fY29udGFpbmVyID0gbnVsbDtcblx0XHR0aGlzLl90aWxlWm9vbSA9IG51bGw7XG5cdH0sXG5cblx0YnJpbmdUb0Zyb250OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX21hcCkge1xuXHRcdFx0TC5Eb21VdGlsLnRvRnJvbnQodGhpcy5fY29udGFpbmVyKTtcblx0XHRcdHRoaXMuX3NldEF1dG9aSW5kZXgoTWF0aC5tYXgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRicmluZ1RvQmFjazogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9tYXApIHtcblx0XHRcdEwuRG9tVXRpbC50b0JhY2sodGhpcy5fY29udGFpbmVyKTtcblx0XHRcdHRoaXMuX3NldEF1dG9aSW5kZXgoTWF0aC5taW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRnZXRBdHRyaWJ1dGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuYXR0cmlidXRpb247XG5cdH0sXG5cblx0Z2V0Q29udGFpbmVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0fSxcblxuXHRzZXRPcGFjaXR5OiBmdW5jdGlvbiAob3BhY2l0eSkge1xuXHRcdHRoaXMub3B0aW9ucy5vcGFjaXR5ID0gb3BhY2l0eTtcblx0XHR0aGlzLl91cGRhdGVPcGFjaXR5KCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0c2V0WkluZGV4OiBmdW5jdGlvbiAoekluZGV4KSB7XG5cdFx0dGhpcy5vcHRpb25zLnpJbmRleCA9IHpJbmRleDtcblx0XHR0aGlzLl91cGRhdGVaSW5kZXgoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGlzTG9hZGluZzogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9sb2FkaW5nO1xuXHR9LFxuXG5cdHJlZHJhdzogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9tYXApIHtcblx0XHRcdHRoaXMuX3JlbW92ZUFsbFRpbGVzKCk7XG5cdFx0XHR0aGlzLl91cGRhdGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Z2V0RXZlbnRzOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGV2ZW50cyA9IHtcblx0XHRcdHZpZXdyZXNldDogdGhpcy5fcmVzZXRBbGwsXG5cdFx0XHR6b29tOiB0aGlzLl9yZXNldFZpZXcsXG5cdFx0XHRtb3ZlZW5kOiB0aGlzLl9vbk1vdmVFbmRcblx0XHR9O1xuXG5cdFx0aWYgKCF0aGlzLm9wdGlvbnMudXBkYXRlV2hlbklkbGUpIHtcblx0XHRcdC8vIHVwZGF0ZSB0aWxlcyBvbiBtb3ZlLCBidXQgbm90IG1vcmUgb2Z0ZW4gdGhhbiBvbmNlIHBlciBnaXZlbiBpbnRlcnZhbFxuXHRcdFx0aWYgKCF0aGlzLl9vbk1vdmUpIHtcblx0XHRcdFx0dGhpcy5fb25Nb3ZlID0gTC5VdGlsLnRocm90dGxlKHRoaXMuX29uTW92ZUVuZCwgdGhpcy5vcHRpb25zLnVwZGF0ZUludGVydmFsLCB0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0ZXZlbnRzLm1vdmUgPSB0aGlzLl9vbk1vdmU7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xuXHRcdFx0ZXZlbnRzLnpvb21hbmltID0gdGhpcy5fYW5pbWF0ZVpvb207XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGV2ZW50cztcblx0fSxcblxuXHRjcmVhdGVUaWxlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHR9LFxuXG5cdGdldFRpbGVTaXplOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHMgPSB0aGlzLm9wdGlvbnMudGlsZVNpemU7XG5cdFx0cmV0dXJuIHMgaW5zdGFuY2VvZiBMLlBvaW50ID8gcyA6IG5ldyBMLlBvaW50KHMsIHMpO1xuXHR9LFxuXG5cdF91cGRhdGVaSW5kZXg6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fY29udGFpbmVyICYmIHRoaXMub3B0aW9ucy56SW5kZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMuekluZGV4ICE9PSBudWxsKSB7XG5cdFx0XHR0aGlzLl9jb250YWluZXIuc3R5bGUuekluZGV4ID0gdGhpcy5vcHRpb25zLnpJbmRleDtcblx0XHR9XG5cdH0sXG5cblx0X3NldEF1dG9aSW5kZXg6IGZ1bmN0aW9uIChjb21wYXJlKSB7XG5cdFx0Ly8gZ28gdGhyb3VnaCBhbGwgb3RoZXIgbGF5ZXJzIG9mIHRoZSBzYW1lIHBhbmUsIHNldCB6SW5kZXggdG8gbWF4ICsgMSAoZnJvbnQpIG9yIG1pbiAtIDEgKGJhY2spXG5cblx0XHR2YXIgbGF5ZXJzID0gdGhpcy5nZXRQYW5lKCkuY2hpbGRyZW4sXG5cdFx0ICAgIGVkZ2VaSW5kZXggPSAtY29tcGFyZSgtSW5maW5pdHksIEluZmluaXR5KTsgLy8gLUluZmluaXR5IGZvciBtYXgsIEluZmluaXR5IGZvciBtaW5cblxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsYXllcnMubGVuZ3RoLCB6SW5kZXg7IGkgPCBsZW47IGkrKykge1xuXG5cdFx0XHR6SW5kZXggPSBsYXllcnNbaV0uc3R5bGUuekluZGV4O1xuXG5cdFx0XHRpZiAobGF5ZXJzW2ldICE9PSB0aGlzLl9jb250YWluZXIgJiYgekluZGV4KSB7XG5cdFx0XHRcdGVkZ2VaSW5kZXggPSBjb21wYXJlKGVkZ2VaSW5kZXgsICt6SW5kZXgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChpc0Zpbml0ZShlZGdlWkluZGV4KSkge1xuXHRcdFx0dGhpcy5vcHRpb25zLnpJbmRleCA9IGVkZ2VaSW5kZXggKyBjb21wYXJlKC0xLCAxKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVpJbmRleCgpO1xuXHRcdH1cblx0fSxcblxuXHRfdXBkYXRlT3BhY2l0eTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5fbWFwKSB7IHJldHVybjsgfVxuXG5cdFx0Ly8gSUUgZG9lc24ndCBpbmhlcml0IGZpbHRlciBvcGFjaXR5IHByb3Blcmx5LCBzbyB3ZSdyZSBmb3JjZWQgdG8gc2V0IGl0IG9uIHRpbGVzXG5cdFx0aWYgKEwuQnJvd3Nlci5pZWx0OSB8fCAhdGhpcy5fbWFwLl9mYWRlQW5pbWF0ZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsIHRoaXMub3B0aW9ucy5vcGFjaXR5KTtcblxuXHRcdHZhciBub3cgPSArbmV3IERhdGUoKSxcblx0XHQgICAgbmV4dEZyYW1lID0gZmFsc2UsXG5cdFx0ICAgIHdpbGxQcnVuZSA9IGZhbHNlO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIHRoaXMuX3RpbGVzKSB7XG5cdFx0XHR2YXIgdGlsZSA9IHRoaXMuX3RpbGVzW2tleV07XG5cdFx0XHRpZiAoIXRpbGUuY3VycmVudCB8fCAhdGlsZS5sb2FkZWQpIHsgY29udGludWU7IH1cblxuXHRcdFx0dmFyIGZhZGUgPSBNYXRoLm1pbigxLCAobm93IC0gdGlsZS5sb2FkZWQpIC8gMjAwKTtcblxuXHRcdFx0TC5Eb21VdGlsLnNldE9wYWNpdHkodGlsZS5lbCwgZmFkZSk7XG5cdFx0XHRpZiAoZmFkZSA8IDEpIHtcblx0XHRcdFx0bmV4dEZyYW1lID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aWxlLmFjdGl2ZSkgeyB3aWxsUHJ1bmUgPSB0cnVlOyB9XG5cdFx0XHRcdHRpbGUuYWN0aXZlID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAod2lsbFBydW5lICYmICF0aGlzLl9ub1BydW5lKSB7IHRoaXMuX3BydW5lVGlsZXMoKTsgfVxuXG5cdFx0aWYgKG5leHRGcmFtZSkge1xuXHRcdFx0TC5VdGlsLmNhbmNlbEFuaW1GcmFtZSh0aGlzLl9mYWRlRnJhbWUpO1xuXHRcdFx0dGhpcy5fZmFkZUZyYW1lID0gTC5VdGlsLnJlcXVlc3RBbmltRnJhbWUodGhpcy5fdXBkYXRlT3BhY2l0eSwgdGhpcyk7XG5cdFx0fVxuXHR9LFxuXG5cdF9pbml0Q29udGFpbmVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX2NvbnRhaW5lcikgeyByZXR1cm47IH1cblxuXHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LWxheWVyJyk7XG5cdFx0dGhpcy5fdXBkYXRlWkluZGV4KCk7XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLm9wYWNpdHkgPCAxKSB7XG5cdFx0XHR0aGlzLl91cGRhdGVPcGFjaXR5KCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRQYW5lKCkuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKTtcblx0fSxcblxuXHRfdXBkYXRlTGV2ZWxzOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgem9vbSA9IHRoaXMuX3RpbGVab29tLFxuXHRcdCAgICBtYXhab29tID0gdGhpcy5vcHRpb25zLm1heFpvb207XG5cblx0XHRmb3IgKHZhciB6IGluIHRoaXMuX2xldmVscykge1xuXHRcdFx0aWYgKHRoaXMuX2xldmVsc1t6XS5lbC5jaGlsZHJlbi5sZW5ndGggfHwgeiA9PT0gem9vbSkge1xuXHRcdFx0XHR0aGlzLl9sZXZlbHNbel0uZWwuc3R5bGUuekluZGV4ID0gbWF4Wm9vbSAtIE1hdGguYWJzKHpvb20gLSB6KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fbGV2ZWxzW3pdLmVsKTtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2xldmVsc1t6XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgbGV2ZWwgPSB0aGlzLl9sZXZlbHNbem9vbV0sXG5cdFx0ICAgIG1hcCA9IHRoaXMuX21hcDtcblxuXHRcdGlmICghbGV2ZWwpIHtcblx0XHRcdGxldmVsID0gdGhpcy5fbGV2ZWxzW3pvb21dID0ge307XG5cblx0XHRcdGxldmVsLmVsID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtdGlsZS1jb250YWluZXIgbGVhZmxldC16b29tLWFuaW1hdGVkJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHRcdGxldmVsLmVsLnN0eWxlLnpJbmRleCA9IG1heFpvb207XG5cblx0XHRcdGxldmVsLm9yaWdpbiA9IG1hcC5wcm9qZWN0KG1hcC51bnByb2plY3QobWFwLmdldFBpeGVsT3JpZ2luKCkpLCB6b29tKS5yb3VuZCgpO1xuXHRcdFx0bGV2ZWwuem9vbSA9IHpvb207XG5cblx0XHRcdHRoaXMuX3NldFpvb21UcmFuc2Zvcm0obGV2ZWwsIG1hcC5nZXRDZW50ZXIoKSwgbWFwLmdldFpvb20oKSk7XG5cblx0XHRcdC8vIGZvcmNlIHRoZSBicm93c2VyIHRvIGNvbnNpZGVyIHRoZSBuZXdseSBhZGRlZCBlbGVtZW50IGZvciB0cmFuc2l0aW9uXG5cdFx0XHRMLlV0aWwuZmFsc2VGbihsZXZlbC5lbC5vZmZzZXRXaWR0aCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbGV2ZWwgPSBsZXZlbDtcblxuXHRcdHJldHVybiBsZXZlbDtcblx0fSxcblxuXHRfcHJ1bmVUaWxlczogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBrZXksIHRpbGU7XG5cblx0XHR2YXIgem9vbSA9IHRoaXMuX21hcC5nZXRab29tKCk7XG5cdFx0aWYgKHpvb20gPiB0aGlzLm9wdGlvbnMubWF4Wm9vbSB8fFxuXHRcdFx0em9vbSA8IHRoaXMub3B0aW9ucy5taW5ab29tKSB7IHJldHVybiB0aGlzLl9yZW1vdmVBbGxUaWxlcygpOyB9XG5cblx0XHRmb3IgKGtleSBpbiB0aGlzLl90aWxlcykge1xuXHRcdFx0dGlsZSA9IHRoaXMuX3RpbGVzW2tleV07XG5cdFx0XHR0aWxlLnJldGFpbiA9IHRpbGUuY3VycmVudDtcblx0XHR9XG5cblx0XHRmb3IgKGtleSBpbiB0aGlzLl90aWxlcykge1xuXHRcdFx0dGlsZSA9IHRoaXMuX3RpbGVzW2tleV07XG5cdFx0XHRpZiAodGlsZS5jdXJyZW50ICYmICF0aWxlLmFjdGl2ZSkge1xuXHRcdFx0XHR2YXIgY29vcmRzID0gdGlsZS5jb29yZHM7XG5cdFx0XHRcdGlmICghdGhpcy5fcmV0YWluUGFyZW50KGNvb3Jkcy54LCBjb29yZHMueSwgY29vcmRzLnosIGNvb3Jkcy56IC0gNSkpIHtcblx0XHRcdFx0XHR0aGlzLl9yZXRhaW5DaGlsZHJlbihjb29yZHMueCwgY29vcmRzLnksIGNvb3Jkcy56LCBjb29yZHMueiArIDIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yIChrZXkgaW4gdGhpcy5fdGlsZXMpIHtcblx0XHRcdGlmICghdGhpcy5fdGlsZXNba2V5XS5yZXRhaW4pIHtcblx0XHRcdFx0dGhpcy5fcmVtb3ZlVGlsZShrZXkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRfcmVtb3ZlQWxsVGlsZXM6IGZ1bmN0aW9uICgpIHtcblx0XHRmb3IgKHZhciBrZXkgaW4gdGhpcy5fdGlsZXMpIHtcblx0XHRcdHRoaXMuX3JlbW92ZVRpbGUoa2V5KTtcblx0XHR9XG5cdH0sXG5cblx0X3Jlc2V0QWxsOiBmdW5jdGlvbiAoKSB7XG5cdFx0Zm9yICh2YXIgeiBpbiB0aGlzLl9sZXZlbHMpIHtcblx0XHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fbGV2ZWxzW3pdLmVsKTtcblx0XHRcdGRlbGV0ZSB0aGlzLl9sZXZlbHNbel07XG5cdFx0fVxuXHRcdHRoaXMuX3JlbW92ZUFsbFRpbGVzKCk7XG5cblx0XHR0aGlzLl90aWxlWm9vbSA9IG51bGw7XG5cdFx0dGhpcy5fcmVzZXRWaWV3KCk7XG5cdH0sXG5cblx0X3JldGFpblBhcmVudDogZnVuY3Rpb24gKHgsIHksIHosIG1pblpvb20pIHtcblx0XHR2YXIgeDIgPSBNYXRoLmZsb29yKHggLyAyKSxcblx0XHQgICAgeTIgPSBNYXRoLmZsb29yKHkgLyAyKSxcblx0XHQgICAgejIgPSB6IC0gMTtcblxuXHRcdHZhciBrZXkgPSB4MiArICc6JyArIHkyICsgJzonICsgejIsXG5cdFx0ICAgIHRpbGUgPSB0aGlzLl90aWxlc1trZXldO1xuXG5cdFx0aWYgKHRpbGUgJiYgdGlsZS5hY3RpdmUpIHtcblx0XHRcdHRpbGUucmV0YWluID0gdHJ1ZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0fSBlbHNlIGlmICh0aWxlICYmIHRpbGUubG9hZGVkKSB7XG5cdFx0XHR0aWxlLnJldGFpbiA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKHoyID4gbWluWm9vbSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3JldGFpblBhcmVudCh4MiwgeTIsIHoyLCBtaW5ab29tKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0X3JldGFpbkNoaWxkcmVuOiBmdW5jdGlvbiAoeCwgeSwgeiwgbWF4Wm9vbSkge1xuXG5cdFx0Zm9yICh2YXIgaSA9IDIgKiB4OyBpIDwgMiAqIHggKyAyOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAyICogeTsgaiA8IDIgKiB5ICsgMjsgaisrKSB7XG5cblx0XHRcdFx0dmFyIGtleSA9IGkgKyAnOicgKyBqICsgJzonICsgKHogKyAxKSxcblx0XHRcdFx0ICAgIHRpbGUgPSB0aGlzLl90aWxlc1trZXldO1xuXG5cdFx0XHRcdGlmICh0aWxlICYmIHRpbGUuYWN0aXZlKSB7XG5cdFx0XHRcdFx0dGlsZS5yZXRhaW4gPSB0cnVlO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAodGlsZSAmJiB0aWxlLmxvYWRlZCkge1xuXHRcdFx0XHRcdHRpbGUucmV0YWluID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh6ICsgMSA8IG1heFpvb20pIHtcblx0XHRcdFx0XHR0aGlzLl9yZXRhaW5DaGlsZHJlbihpLCBqLCB6ICsgMSwgbWF4Wm9vbSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0X3Jlc2V0VmlldzogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgYW5pbWF0aW5nID0gZSAmJiAoZS5waW5jaCB8fCBlLmZseVRvKTtcblx0XHR0aGlzLl9zZXRWaWV3KHRoaXMuX21hcC5nZXRDZW50ZXIoKSwgdGhpcy5fbWFwLmdldFpvb20oKSwgYW5pbWF0aW5nLCBhbmltYXRpbmcpO1xuXHR9LFxuXG5cdF9hbmltYXRlWm9vbTogZnVuY3Rpb24gKGUpIHtcblx0XHR0aGlzLl9zZXRWaWV3KGUuY2VudGVyLCBlLnpvb20sIHRydWUsIGUubm9VcGRhdGUpO1xuXHR9LFxuXG5cdF9zZXRWaWV3OiBmdW5jdGlvbiAoY2VudGVyLCB6b29tLCBub1BydW5lLCBub1VwZGF0ZSkge1xuXHRcdHZhciB0aWxlWm9vbSA9IE1hdGgucm91bmQoem9vbSk7XG5cdFx0aWYgKCh0aGlzLm9wdGlvbnMubWF4Wm9vbSAhPT0gdW5kZWZpbmVkICYmIHRpbGVab29tID4gdGhpcy5vcHRpb25zLm1heFpvb20pIHx8XG5cdFx0ICAgICh0aGlzLm9wdGlvbnMubWluWm9vbSAhPT0gdW5kZWZpbmVkICYmIHRpbGVab29tIDwgdGhpcy5vcHRpb25zLm1pblpvb20pKSB7XG5cdFx0XHR0aWxlWm9vbSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHR2YXIgdGlsZVpvb21DaGFuZ2VkID0gKHRpbGVab29tICE9PSB0aGlzLl90aWxlWm9vbSk7XG5cblx0XHRpZiAoIW5vVXBkYXRlIHx8IHRpbGVab29tQ2hhbmdlZCkge1xuXG5cdFx0XHR0aGlzLl90aWxlWm9vbSA9IHRpbGVab29tO1xuXG5cdFx0XHRpZiAodGhpcy5fYWJvcnRMb2FkaW5nKSB7XG5cdFx0XHRcdHRoaXMuX2Fib3J0TG9hZGluZygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVMZXZlbHMoKTtcblx0XHRcdHRoaXMuX3Jlc2V0R3JpZCgpO1xuXG5cdFx0XHRpZiAodGlsZVpvb20gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl91cGRhdGUoY2VudGVyKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFub1BydW5lKSB7XG5cdFx0XHRcdHRoaXMuX3BydW5lVGlsZXMoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRmxhZyB0byBwcmV2ZW50IF91cGRhdGVPcGFjaXR5IGZyb20gcHJ1bmluZyB0aWxlcyBkdXJpbmdcblx0XHRcdC8vIGEgem9vbSBhbmltIG9yIGEgcGluY2ggZ2VzdHVyZVxuXHRcdFx0dGhpcy5fbm9QcnVuZSA9ICEhbm9QcnVuZTtcblx0XHR9XG5cblx0XHR0aGlzLl9zZXRab29tVHJhbnNmb3JtcyhjZW50ZXIsIHpvb20pO1xuXHR9LFxuXG5cdF9zZXRab29tVHJhbnNmb3JtczogZnVuY3Rpb24gKGNlbnRlciwgem9vbSkge1xuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5fbGV2ZWxzKSB7XG5cdFx0XHR0aGlzLl9zZXRab29tVHJhbnNmb3JtKHRoaXMuX2xldmVsc1tpXSwgY2VudGVyLCB6b29tKTtcblx0XHR9XG5cdH0sXG5cblx0X3NldFpvb21UcmFuc2Zvcm06IGZ1bmN0aW9uIChsZXZlbCwgY2VudGVyLCB6b29tKSB7XG5cdFx0dmFyIHNjYWxlID0gdGhpcy5fbWFwLmdldFpvb21TY2FsZSh6b29tLCBsZXZlbC56b29tKSxcblx0XHQgICAgdHJhbnNsYXRlID0gbGV2ZWwub3JpZ2luLm11bHRpcGx5Qnkoc2NhbGUpXG5cdFx0ICAgICAgICAuc3VidHJhY3QodGhpcy5fbWFwLl9nZXROZXdQaXhlbE9yaWdpbihjZW50ZXIsIHpvb20pKS5yb3VuZCgpO1xuXG5cdFx0aWYgKEwuQnJvd3Nlci5hbnkzZCkge1xuXHRcdFx0TC5Eb21VdGlsLnNldFRyYW5zZm9ybShsZXZlbC5lbCwgdHJhbnNsYXRlLCBzY2FsZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdEwuRG9tVXRpbC5zZXRQb3NpdGlvbihsZXZlbC5lbCwgdHJhbnNsYXRlKTtcblx0XHR9XG5cdH0sXG5cblx0X3Jlc2V0R3JpZDogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXG5cdFx0ICAgIGNycyA9IG1hcC5vcHRpb25zLmNycyxcblx0XHQgICAgdGlsZVNpemUgPSB0aGlzLl90aWxlU2l6ZSA9IHRoaXMuZ2V0VGlsZVNpemUoKSxcblx0XHQgICAgdGlsZVpvb20gPSB0aGlzLl90aWxlWm9vbTtcblxuXHRcdHZhciBib3VuZHMgPSB0aGlzLl9tYXAuZ2V0UGl4ZWxXb3JsZEJvdW5kcyh0aGlzLl90aWxlWm9vbSk7XG5cdFx0aWYgKGJvdW5kcykge1xuXHRcdFx0dGhpcy5fZ2xvYmFsVGlsZVJhbmdlID0gdGhpcy5fcHhCb3VuZHNUb1RpbGVSYW5nZShib3VuZHMpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3dyYXBYID0gY3JzLndyYXBMbmcgJiYgIXRoaXMub3B0aW9ucy5ub1dyYXAgJiYgW1xuXHRcdFx0TWF0aC5mbG9vcihtYXAucHJvamVjdChbMCwgY3JzLndyYXBMbmdbMF1dLCB0aWxlWm9vbSkueCAvIHRpbGVTaXplLngpLFxuXHRcdFx0TWF0aC5jZWlsKG1hcC5wcm9qZWN0KFswLCBjcnMud3JhcExuZ1sxXV0sIHRpbGVab29tKS54IC8gdGlsZVNpemUueSlcblx0XHRdO1xuXHRcdHRoaXMuX3dyYXBZID0gY3JzLndyYXBMYXQgJiYgIXRoaXMub3B0aW9ucy5ub1dyYXAgJiYgW1xuXHRcdFx0TWF0aC5mbG9vcihtYXAucHJvamVjdChbY3JzLndyYXBMYXRbMF0sIDBdLCB0aWxlWm9vbSkueSAvIHRpbGVTaXplLngpLFxuXHRcdFx0TWF0aC5jZWlsKG1hcC5wcm9qZWN0KFtjcnMud3JhcExhdFsxXSwgMF0sIHRpbGVab29tKS55IC8gdGlsZVNpemUueSlcblx0XHRdO1xuXHR9LFxuXG5cdF9vbk1vdmVFbmQ6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX21hcCB8fCB0aGlzLl9tYXAuX2FuaW1hdGluZ1pvb20pIHsgcmV0dXJuOyB9XG5cblx0XHR0aGlzLl9yZXNldFZpZXcoKTtcblx0fSxcblxuXHRfZ2V0VGlsZWRQaXhlbEJvdW5kczogZnVuY3Rpb24gKGNlbnRlciwgem9vbSwgdGlsZVpvb20pIHtcblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwLFxuXHRcdCAgICBzY2FsZSA9IG1hcC5nZXRab29tU2NhbGUoem9vbSwgdGlsZVpvb20pLFxuXHRcdCAgICBwaXhlbENlbnRlciA9IG1hcC5wcm9qZWN0KGNlbnRlciwgdGlsZVpvb20pLmZsb29yKCksXG5cdFx0ICAgIGhhbGZTaXplID0gbWFwLmdldFNpemUoKS5kaXZpZGVCeShzY2FsZSAqIDIpO1xuXG5cdFx0cmV0dXJuIG5ldyBMLkJvdW5kcyhwaXhlbENlbnRlci5zdWJ0cmFjdChoYWxmU2l6ZSksIHBpeGVsQ2VudGVyLmFkZChoYWxmU2l6ZSkpO1xuXHR9LFxuXG5cdC8vIFByaXZhdGUgbWV0aG9kIHRvIGxvYWQgdGlsZXMgaW4gdGhlIGdyaWQncyBhY3RpdmUgem9vbSBsZXZlbCBhY2NvcmRpbmcgdG8gbWFwIGJvdW5kc1xuXHRfdXBkYXRlOiBmdW5jdGlvbiAoY2VudGVyKSB7XG5cdFx0dmFyIG1hcCA9IHRoaXMuX21hcDtcblx0XHRpZiAoIW1hcCkgeyByZXR1cm47IH1cblx0XHR2YXIgem9vbSA9IG1hcC5nZXRab29tKCk7XG5cblx0XHRpZiAoY2VudGVyID09PSB1bmRlZmluZWQpIHsgY2VudGVyID0gbWFwLmdldENlbnRlcigpOyB9XG5cdFx0aWYgKHRoaXMuX3RpbGVab29tID09PSB1bmRlZmluZWQpIHsgcmV0dXJuOyB9XHQvLyBpZiBvdXQgb2YgbWluem9vbS9tYXh6b29tXG5cblx0XHR2YXIgcGl4ZWxCb3VuZHMgPSB0aGlzLl9nZXRUaWxlZFBpeGVsQm91bmRzKGNlbnRlciwgem9vbSwgdGhpcy5fdGlsZVpvb20pLFxuXHRcdCAgICB0aWxlUmFuZ2UgPSB0aGlzLl9weEJvdW5kc1RvVGlsZVJhbmdlKHBpeGVsQm91bmRzKSxcblx0XHQgICAgdGlsZUNlbnRlciA9IHRpbGVSYW5nZS5nZXRDZW50ZXIoKSxcblx0XHQgICAgcXVldWUgPSBbXTtcblxuXHRcdGZvciAodmFyIGtleSBpbiB0aGlzLl90aWxlcykge1xuXHRcdFx0dGhpcy5fdGlsZXNba2V5XS5jdXJyZW50ID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gX3VwZGF0ZSBqdXN0IGxvYWRzIG1vcmUgdGlsZXMuIElmIHRoZSB0aWxlIHpvb20gbGV2ZWwgZGlmZmVycyB0b28gbXVjaFxuXHRcdC8vIGZyb20gdGhlIG1hcCdzLCBsZXQgX3NldFZpZXcgcmVzZXQgbGV2ZWxzIGFuZCBwcnVuZSBvbGQgdGlsZXMuXG5cdFx0aWYgKE1hdGguYWJzKHpvb20gLSB0aGlzLl90aWxlWm9vbSkgPiAxKSB7IHRoaXMuX3NldFZpZXcoY2VudGVyLCB6b29tKTsgcmV0dXJuOyB9XG5cblx0XHQvLyBjcmVhdGUgYSBxdWV1ZSBvZiBjb29yZGluYXRlcyB0byBsb2FkIHRpbGVzIGZyb21cblx0XHRmb3IgKHZhciBqID0gdGlsZVJhbmdlLm1pbi55OyBqIDw9IHRpbGVSYW5nZS5tYXgueTsgaisrKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gdGlsZVJhbmdlLm1pbi54OyBpIDw9IHRpbGVSYW5nZS5tYXgueDsgaSsrKSB7XG5cdFx0XHRcdHZhciBjb29yZHMgPSBuZXcgTC5Qb2ludChpLCBqKTtcblx0XHRcdFx0Y29vcmRzLnogPSB0aGlzLl90aWxlWm9vbTtcblxuXHRcdFx0XHRpZiAoIXRoaXMuX2lzVmFsaWRUaWxlKGNvb3JkcykpIHsgY29udGludWU7IH1cblxuXHRcdFx0XHR2YXIgdGlsZSA9IHRoaXMuX3RpbGVzW3RoaXMuX3RpbGVDb29yZHNUb0tleShjb29yZHMpXTtcblx0XHRcdFx0aWYgKHRpbGUpIHtcblx0XHRcdFx0XHR0aWxlLmN1cnJlbnQgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHF1ZXVlLnB1c2goY29vcmRzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNvcnQgdGlsZSBxdWV1ZSB0byBsb2FkIHRpbGVzIGluIG9yZGVyIG9mIHRoZWlyIGRpc3RhbmNlIHRvIGNlbnRlclxuXHRcdHF1ZXVlLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0XHRcdHJldHVybiBhLmRpc3RhbmNlVG8odGlsZUNlbnRlcikgLSBiLmRpc3RhbmNlVG8odGlsZUNlbnRlcik7XG5cdFx0fSk7XG5cblx0XHRpZiAocXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHQvLyBpZiBpdHMgdGhlIGZpcnN0IGJhdGNoIG9mIHRpbGVzIHRvIGxvYWRcblx0XHRcdGlmICghdGhpcy5fbG9hZGluZykge1xuXHRcdFx0XHR0aGlzLl9sb2FkaW5nID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5maXJlKCdsb2FkaW5nJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNyZWF0ZSBET00gZnJhZ21lbnQgdG8gYXBwZW5kIHRpbGVzIGluIG9uZSBiYXRjaFxuXHRcdFx0dmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dGhpcy5fYWRkVGlsZShxdWV1ZVtpXSwgZnJhZ21lbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9sZXZlbC5lbC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG5cdFx0fVxuXHR9LFxuXG5cdF9pc1ZhbGlkVGlsZTogZnVuY3Rpb24gKGNvb3Jkcykge1xuXHRcdHZhciBjcnMgPSB0aGlzLl9tYXAub3B0aW9ucy5jcnM7XG5cblx0XHRpZiAoIWNycy5pbmZpbml0ZSkge1xuXHRcdFx0Ly8gZG9uJ3QgbG9hZCB0aWxlIGlmIGl0J3Mgb3V0IG9mIGJvdW5kcyBhbmQgbm90IHdyYXBwZWRcblx0XHRcdHZhciBib3VuZHMgPSB0aGlzLl9nbG9iYWxUaWxlUmFuZ2U7XG5cdFx0XHRpZiAoKCFjcnMud3JhcExuZyAmJiAoY29vcmRzLnggPCBib3VuZHMubWluLnggfHwgY29vcmRzLnggPiBib3VuZHMubWF4LngpKSB8fFxuXHRcdFx0ICAgICghY3JzLndyYXBMYXQgJiYgKGNvb3Jkcy55IDwgYm91bmRzLm1pbi55IHx8IGNvb3Jkcy55ID4gYm91bmRzLm1heC55KSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLm9wdGlvbnMuYm91bmRzKSB7IHJldHVybiB0cnVlOyB9XG5cblx0XHQvLyBkb24ndCBsb2FkIHRpbGUgaWYgaXQgZG9lc24ndCBpbnRlcnNlY3QgdGhlIGJvdW5kcyBpbiBvcHRpb25zXG5cdFx0dmFyIHRpbGVCb3VuZHMgPSB0aGlzLl90aWxlQ29vcmRzVG9Cb3VuZHMoY29vcmRzKTtcblx0XHRyZXR1cm4gTC5sYXRMbmdCb3VuZHModGhpcy5vcHRpb25zLmJvdW5kcykub3ZlcmxhcHModGlsZUJvdW5kcyk7XG5cdH0sXG5cblx0X2tleVRvQm91bmRzOiBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3RpbGVDb29yZHNUb0JvdW5kcyh0aGlzLl9rZXlUb1RpbGVDb29yZHMoa2V5KSk7XG5cdH0sXG5cblx0Ly8gY29udmVydHMgdGlsZSBjb29yZGluYXRlcyB0byBpdHMgZ2VvZ3JhcGhpY2FsIGJvdW5kc1xuXHRfdGlsZUNvb3Jkc1RvQm91bmRzOiBmdW5jdGlvbiAoY29vcmRzKSB7XG5cblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwLFxuXHRcdCAgICB0aWxlU2l6ZSA9IHRoaXMuZ2V0VGlsZVNpemUoKSxcblxuXHRcdCAgICBud1BvaW50ID0gY29vcmRzLnNjYWxlQnkodGlsZVNpemUpLFxuXHRcdCAgICBzZVBvaW50ID0gbndQb2ludC5hZGQodGlsZVNpemUpLFxuXG5cdFx0ICAgIG53ID0gbWFwLndyYXBMYXRMbmcobWFwLnVucHJvamVjdChud1BvaW50LCBjb29yZHMueikpLFxuXHRcdCAgICBzZSA9IG1hcC53cmFwTGF0TG5nKG1hcC51bnByb2plY3Qoc2VQb2ludCwgY29vcmRzLnopKTtcblxuXHRcdHJldHVybiBuZXcgTC5MYXRMbmdCb3VuZHMobncsIHNlKTtcblx0fSxcblxuXHQvLyBjb252ZXJ0cyB0aWxlIGNvb3JkaW5hdGVzIHRvIGtleSBmb3IgdGhlIHRpbGUgY2FjaGVcblx0X3RpbGVDb29yZHNUb0tleTogZnVuY3Rpb24gKGNvb3Jkcykge1xuXHRcdHJldHVybiBjb29yZHMueCArICc6JyArIGNvb3Jkcy55ICsgJzonICsgY29vcmRzLno7XG5cdH0sXG5cblx0Ly8gY29udmVydHMgdGlsZSBjYWNoZSBrZXkgdG8gY29vcmRpbmF0ZXNcblx0X2tleVRvVGlsZUNvb3JkczogZnVuY3Rpb24gKGtleSkge1xuXHRcdHZhciBrID0ga2V5LnNwbGl0KCc6JyksXG5cdFx0ICAgIGNvb3JkcyA9IG5ldyBMLlBvaW50KCtrWzBdLCAra1sxXSk7XG5cdFx0Y29vcmRzLnogPSAra1syXTtcblx0XHRyZXR1cm4gY29vcmRzO1xuXHR9LFxuXG5cdF9yZW1vdmVUaWxlOiBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0dmFyIHRpbGUgPSB0aGlzLl90aWxlc1trZXldO1xuXHRcdGlmICghdGlsZSkgeyByZXR1cm47IH1cblxuXHRcdEwuRG9tVXRpbC5yZW1vdmUodGlsZS5lbCk7XG5cblx0XHRkZWxldGUgdGhpcy5fdGlsZXNba2V5XTtcblxuXHRcdHRoaXMuZmlyZSgndGlsZXVubG9hZCcsIHtcblx0XHRcdHRpbGU6IHRpbGUuZWwsXG5cdFx0XHRjb29yZHM6IHRoaXMuX2tleVRvVGlsZUNvb3JkcyhrZXkpXG5cdFx0fSk7XG5cdH0sXG5cblx0X2luaXRUaWxlOiBmdW5jdGlvbiAodGlsZSkge1xuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aWxlLCAnbGVhZmxldC10aWxlJyk7XG5cblx0XHR2YXIgdGlsZVNpemUgPSB0aGlzLmdldFRpbGVTaXplKCk7XG5cdFx0dGlsZS5zdHlsZS53aWR0aCA9IHRpbGVTaXplLnggKyAncHgnO1xuXHRcdHRpbGUuc3R5bGUuaGVpZ2h0ID0gdGlsZVNpemUueSArICdweCc7XG5cblx0XHR0aWxlLm9uc2VsZWN0c3RhcnQgPSBMLlV0aWwuZmFsc2VGbjtcblx0XHR0aWxlLm9ubW91c2Vtb3ZlID0gTC5VdGlsLmZhbHNlRm47XG5cblx0XHQvLyB1cGRhdGUgb3BhY2l0eSBvbiB0aWxlcyBpbiBJRTctOCBiZWNhdXNlIG9mIGZpbHRlciBpbmhlcml0YW5jZSBwcm9ibGVtc1xuXHRcdGlmIChMLkJyb3dzZXIuaWVsdDkgJiYgdGhpcy5vcHRpb25zLm9wYWNpdHkgPCAxKSB7XG5cdFx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aWxlLCB0aGlzLm9wdGlvbnMub3BhY2l0eSk7XG5cdFx0fVxuXG5cdFx0Ly8gd2l0aG91dCB0aGlzIGhhY2ssIHRpbGVzIGRpc2FwcGVhciBhZnRlciB6b29tIG9uIENocm9tZSBmb3IgQW5kcm9pZFxuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9MZWFmbGV0L0xlYWZsZXQvaXNzdWVzLzIwNzhcblx0XHRpZiAoTC5Ccm93c2VyLmFuZHJvaWQgJiYgIUwuQnJvd3Nlci5hbmRyb2lkMjMpIHtcblx0XHRcdHRpbGUuc3R5bGUuV2Via2l0QmFja2ZhY2VWaXNpYmlsaXR5ID0gJ2hpZGRlbic7XG5cdFx0fVxuXHR9LFxuXG5cdF9hZGRUaWxlOiBmdW5jdGlvbiAoY29vcmRzLCBjb250YWluZXIpIHtcblx0XHR2YXIgdGlsZVBvcyA9IHRoaXMuX2dldFRpbGVQb3MoY29vcmRzKSxcblx0XHQgICAga2V5ID0gdGhpcy5fdGlsZUNvb3Jkc1RvS2V5KGNvb3Jkcyk7XG5cblx0XHR2YXIgdGlsZSA9IHRoaXMuY3JlYXRlVGlsZSh0aGlzLl93cmFwQ29vcmRzKGNvb3JkcyksIEwuYmluZCh0aGlzLl90aWxlUmVhZHksIHRoaXMsIGNvb3JkcykpO1xuXG5cdFx0dGhpcy5faW5pdFRpbGUodGlsZSk7XG5cblx0XHQvLyBpZiBjcmVhdGVUaWxlIGlzIGRlZmluZWQgd2l0aCBhIHNlY29uZCBhcmd1bWVudCAoXCJkb25lXCIgY2FsbGJhY2spLFxuXHRcdC8vIHdlIGtub3cgdGhhdCB0aWxlIGlzIGFzeW5jIGFuZCB3aWxsIGJlIHJlYWR5IGxhdGVyOyBvdGhlcndpc2Vcblx0XHRpZiAodGhpcy5jcmVhdGVUaWxlLmxlbmd0aCA8IDIpIHtcblx0XHRcdC8vIG1hcmsgdGlsZSBhcyByZWFkeSwgYnV0IGRlbGF5IG9uZSBmcmFtZSBmb3Igb3BhY2l0eSBhbmltYXRpb24gdG8gaGFwcGVuXG5cdFx0XHRMLlV0aWwucmVxdWVzdEFuaW1GcmFtZShMLmJpbmQodGhpcy5fdGlsZVJlYWR5LCB0aGlzLCBjb29yZHMsIG51bGwsIHRpbGUpKTtcblx0XHR9XG5cblx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24odGlsZSwgdGlsZVBvcyk7XG5cblx0XHQvLyBzYXZlIHRpbGUgaW4gY2FjaGVcblx0XHR0aGlzLl90aWxlc1trZXldID0ge1xuXHRcdFx0ZWw6IHRpbGUsXG5cdFx0XHRjb29yZHM6IGNvb3Jkcyxcblx0XHRcdGN1cnJlbnQ6IHRydWVcblx0XHR9O1xuXG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHRpbGUpO1xuXHRcdHRoaXMuZmlyZSgndGlsZWxvYWRzdGFydCcsIHtcblx0XHRcdHRpbGU6IHRpbGUsXG5cdFx0XHRjb29yZHM6IGNvb3Jkc1xuXHRcdH0pO1xuXHR9LFxuXG5cdF90aWxlUmVhZHk6IGZ1bmN0aW9uIChjb29yZHMsIGVyciwgdGlsZSkge1xuXHRcdGlmICghdGhpcy5fbWFwKSB7IHJldHVybjsgfVxuXG5cdFx0aWYgKGVycikge1xuXHRcdFx0dGhpcy5maXJlKCd0aWxlZXJyb3InLCB7XG5cdFx0XHRcdGVycm9yOiBlcnIsXG5cdFx0XHRcdHRpbGU6IHRpbGUsXG5cdFx0XHRcdGNvb3JkczogY29vcmRzXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR2YXIga2V5ID0gdGhpcy5fdGlsZUNvb3Jkc1RvS2V5KGNvb3Jkcyk7XG5cblx0XHR0aWxlID0gdGhpcy5fdGlsZXNba2V5XTtcblx0XHRpZiAoIXRpbGUpIHsgcmV0dXJuOyB9XG5cblx0XHR0aWxlLmxvYWRlZCA9ICtuZXcgRGF0ZSgpO1xuXHRcdGlmICh0aGlzLl9tYXAuX2ZhZGVBbmltYXRlZCkge1xuXHRcdFx0TC5Eb21VdGlsLnNldE9wYWNpdHkodGlsZS5lbCwgMCk7XG5cdFx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2ZhZGVGcmFtZSk7XG5cdFx0XHR0aGlzLl9mYWRlRnJhbWUgPSBMLlV0aWwucmVxdWVzdEFuaW1GcmFtZSh0aGlzLl91cGRhdGVPcGFjaXR5LCB0aGlzKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGlsZS5hY3RpdmUgPSB0cnVlO1xuXHRcdFx0dGhpcy5fcHJ1bmVUaWxlcygpO1xuXHRcdH1cblxuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aWxlLmVsLCAnbGVhZmxldC10aWxlLWxvYWRlZCcpO1xuXG5cdFx0dGhpcy5maXJlKCd0aWxlbG9hZCcsIHtcblx0XHRcdHRpbGU6IHRpbGUuZWwsXG5cdFx0XHRjb29yZHM6IGNvb3Jkc1xuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXMuX25vVGlsZXNUb0xvYWQoKSkge1xuXHRcdFx0dGhpcy5fbG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0dGhpcy5maXJlKCdsb2FkJyk7XG5cdFx0fVxuXHR9LFxuXG5cdF9nZXRUaWxlUG9zOiBmdW5jdGlvbiAoY29vcmRzKSB7XG5cdFx0cmV0dXJuIGNvb3Jkcy5zY2FsZUJ5KHRoaXMuZ2V0VGlsZVNpemUoKSkuc3VidHJhY3QodGhpcy5fbGV2ZWwub3JpZ2luKTtcblx0fSxcblxuXHRfd3JhcENvb3JkczogZnVuY3Rpb24gKGNvb3Jkcykge1xuXHRcdHZhciBuZXdDb29yZHMgPSBuZXcgTC5Qb2ludChcblx0XHRcdHRoaXMuX3dyYXBYID8gTC5VdGlsLndyYXBOdW0oY29vcmRzLngsIHRoaXMuX3dyYXBYKSA6IGNvb3Jkcy54LFxuXHRcdFx0dGhpcy5fd3JhcFkgPyBMLlV0aWwud3JhcE51bShjb29yZHMueSwgdGhpcy5fd3JhcFkpIDogY29vcmRzLnkpO1xuXHRcdG5ld0Nvb3Jkcy56ID0gY29vcmRzLno7XG5cdFx0cmV0dXJuIG5ld0Nvb3Jkcztcblx0fSxcblxuXHRfcHhCb3VuZHNUb1RpbGVSYW5nZTogZnVuY3Rpb24gKGJvdW5kcykge1xuXHRcdHZhciB0aWxlU2l6ZSA9IHRoaXMuZ2V0VGlsZVNpemUoKTtcblx0XHRyZXR1cm4gbmV3IEwuQm91bmRzKFxuXHRcdFx0Ym91bmRzLm1pbi51bnNjYWxlQnkodGlsZVNpemUpLmZsb29yKCksXG5cdFx0XHRib3VuZHMubWF4LnVuc2NhbGVCeSh0aWxlU2l6ZSkuY2VpbCgpLnN1YnRyYWN0KFsxLCAxXSkpO1xuXHR9LFxuXG5cdF9ub1RpbGVzVG9Mb2FkOiBmdW5jdGlvbiAoKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIHRoaXMuX3RpbGVzKSB7XG5cdFx0XHRpZiAoIXRoaXMuX3RpbGVzW2tleV0ubG9hZGVkKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufSk7XG5cbkwuZ3JpZExheWVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0cmV0dXJuIG5ldyBMLkdyaWRMYXllcihvcHRpb25zKTtcbn07XG5cblxuXG4vKlxyXG4gKiBMLlRpbGVMYXllciBpcyB1c2VkIGZvciBzdGFuZGFyZCB4eXotbnVtYmVyZWQgdGlsZSBsYXllcnMuXHJcbiAqL1xyXG5cclxuTC5UaWxlTGF5ZXIgPSBMLkdyaWRMYXllci5leHRlbmQoe1xyXG5cclxuXHRvcHRpb25zOiB7XHJcblx0XHRtYXhab29tOiAxOCxcclxuXHJcblx0XHRzdWJkb21haW5zOiAnYWJjJyxcclxuXHRcdGVycm9yVGlsZVVybDogJycsXHJcblx0XHR6b29tT2Zmc2V0OiAwLFxyXG5cclxuXHRcdG1heE5hdGl2ZVpvb206IG51bGwsIC8vIE51bWJlclxyXG5cdFx0dG1zOiBmYWxzZSxcclxuXHRcdHpvb21SZXZlcnNlOiBmYWxzZSxcclxuXHRcdGRldGVjdFJldGluYTogZmFsc2UsXHJcblx0XHRjcm9zc09yaWdpbjogZmFsc2VcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XHJcblxyXG5cdFx0dGhpcy5fdXJsID0gdXJsO1xyXG5cclxuXHRcdG9wdGlvbnMgPSBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XHJcblxyXG5cdFx0Ly8gZGV0ZWN0aW5nIHJldGluYSBkaXNwbGF5cywgYWRqdXN0aW5nIHRpbGVTaXplIGFuZCB6b29tIGxldmVsc1xyXG5cdFx0aWYgKG9wdGlvbnMuZGV0ZWN0UmV0aW5hICYmIEwuQnJvd3Nlci5yZXRpbmEgJiYgb3B0aW9ucy5tYXhab29tID4gMCkge1xyXG5cclxuXHRcdFx0b3B0aW9ucy50aWxlU2l6ZSA9IE1hdGguZmxvb3Iob3B0aW9ucy50aWxlU2l6ZSAvIDIpO1xyXG5cdFx0XHRvcHRpb25zLnpvb21PZmZzZXQrKztcclxuXHJcblx0XHRcdG9wdGlvbnMubWluWm9vbSA9IE1hdGgubWF4KDAsIG9wdGlvbnMubWluWm9vbSk7XHJcblx0XHRcdG9wdGlvbnMubWF4Wm9vbS0tO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5zdWJkb21haW5zID09PSAnc3RyaW5nJykge1xyXG5cdFx0XHRvcHRpb25zLnN1YmRvbWFpbnMgPSBvcHRpb25zLnN1YmRvbWFpbnMuc3BsaXQoJycpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGZvciBodHRwczovL2dpdGh1Yi5jb20vTGVhZmxldC9MZWFmbGV0L2lzc3Vlcy8xMzdcclxuXHRcdGlmICghTC5Ccm93c2VyLmFuZHJvaWQpIHtcclxuXHRcdFx0dGhpcy5vbigndGlsZXVubG9hZCcsIHRoaXMuX29uVGlsZVJlbW92ZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0c2V0VXJsOiBmdW5jdGlvbiAodXJsLCBub1JlZHJhdykge1xyXG5cdFx0dGhpcy5fdXJsID0gdXJsO1xyXG5cclxuXHRcdGlmICghbm9SZWRyYXcpIHtcclxuXHRcdFx0dGhpcy5yZWRyYXcoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGNyZWF0ZVRpbGU6IGZ1bmN0aW9uIChjb29yZHMsIGRvbmUpIHtcclxuXHRcdHZhciB0aWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcblxyXG5cdFx0TC5Eb21FdmVudC5vbih0aWxlLCAnbG9hZCcsIEwuYmluZCh0aGlzLl90aWxlT25Mb2FkLCB0aGlzLCBkb25lLCB0aWxlKSk7XHJcblx0XHRMLkRvbUV2ZW50Lm9uKHRpbGUsICdlcnJvcicsIEwuYmluZCh0aGlzLl90aWxlT25FcnJvciwgdGhpcywgZG9uZSwgdGlsZSkpO1xyXG5cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuY3Jvc3NPcmlnaW4pIHtcclxuXHRcdFx0dGlsZS5jcm9zc09yaWdpbiA9ICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8qXHJcblx0XHQgQWx0IHRhZyBpcyBzZXQgdG8gZW1wdHkgc3RyaW5nIHRvIGtlZXAgc2NyZWVuIHJlYWRlcnMgZnJvbSByZWFkaW5nIFVSTCBhbmQgZm9yIGNvbXBsaWFuY2UgcmVhc29uc1xyXG5cdFx0IGh0dHA6Ly93d3cudzMub3JnL1RSL1dDQUcyMC1URUNIUy9INjdcclxuXHRcdCovXHJcblx0XHR0aWxlLmFsdCA9ICcnO1xyXG5cclxuXHRcdHRpbGUuc3JjID0gdGhpcy5nZXRUaWxlVXJsKGNvb3Jkcyk7XHJcblxyXG5cdFx0cmV0dXJuIHRpbGU7XHJcblx0fSxcclxuXHJcblx0Z2V0VGlsZVVybDogZnVuY3Rpb24gKGNvb3Jkcykge1xyXG5cdFx0cmV0dXJuIEwuVXRpbC50ZW1wbGF0ZSh0aGlzLl91cmwsIEwuZXh0ZW5kKHtcclxuXHRcdFx0cjogdGhpcy5vcHRpb25zLmRldGVjdFJldGluYSAmJiBMLkJyb3dzZXIucmV0aW5hICYmIHRoaXMub3B0aW9ucy5tYXhab29tID4gMCA/ICdAMngnIDogJycsXHJcblx0XHRcdHM6IHRoaXMuX2dldFN1YmRvbWFpbihjb29yZHMpLFxyXG5cdFx0XHR4OiBjb29yZHMueCxcclxuXHRcdFx0eTogdGhpcy5vcHRpb25zLnRtcyA/IHRoaXMuX2dsb2JhbFRpbGVSYW5nZS5tYXgueSAtIGNvb3Jkcy55IDogY29vcmRzLnksXHJcblx0XHRcdHo6IHRoaXMuX2dldFpvb21Gb3JVcmwoKVxyXG5cdFx0fSwgdGhpcy5vcHRpb25zKSk7XHJcblx0fSxcclxuXHJcblx0X3RpbGVPbkxvYWQ6IGZ1bmN0aW9uIChkb25lLCB0aWxlKSB7XHJcblx0XHQvLyBGb3IgaHR0cHM6Ly9naXRodWIuY29tL0xlYWZsZXQvTGVhZmxldC9pc3N1ZXMvMzMzMlxyXG5cdFx0aWYgKEwuQnJvd3Nlci5pZWx0OSkge1xyXG5cdFx0XHRzZXRUaW1lb3V0KEwuYmluZChkb25lLCB0aGlzLCBudWxsLCB0aWxlKSwgMCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRkb25lKG51bGwsIHRpbGUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF90aWxlT25FcnJvcjogZnVuY3Rpb24gKGRvbmUsIHRpbGUsIGUpIHtcclxuXHRcdHZhciBlcnJvclVybCA9IHRoaXMub3B0aW9ucy5lcnJvclRpbGVVcmw7XHJcblx0XHRpZiAoZXJyb3JVcmwpIHtcclxuXHRcdFx0dGlsZS5zcmMgPSBlcnJvclVybDtcclxuXHRcdH1cclxuXHRcdGRvbmUoZSwgdGlsZSk7XHJcblx0fSxcclxuXHJcblx0Z2V0VGlsZVNpemU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXHJcblx0XHQgICAgdGlsZVNpemUgPSBMLkdyaWRMYXllci5wcm90b3R5cGUuZ2V0VGlsZVNpemUuY2FsbCh0aGlzKSxcclxuXHRcdCAgICB6b29tID0gdGhpcy5fdGlsZVpvb20gKyB0aGlzLm9wdGlvbnMuem9vbU9mZnNldCxcclxuXHRcdCAgICB6b29tTiA9IHRoaXMub3B0aW9ucy5tYXhOYXRpdmVab29tO1xyXG5cclxuXHRcdC8vIGluY3JlYXNlIHRpbGUgc2l6ZSB3aGVuIG92ZXJzY2FsaW5nXHJcblx0XHRyZXR1cm4gem9vbU4gIT09IG51bGwgJiYgem9vbSA+IHpvb21OID9cclxuXHRcdFx0XHR0aWxlU2l6ZS5kaXZpZGVCeShtYXAuZ2V0Wm9vbVNjYWxlKHpvb21OLCB6b29tKSkucm91bmQoKSA6XHJcblx0XHRcdFx0dGlsZVNpemU7XHJcblx0fSxcclxuXHJcblx0X29uVGlsZVJlbW92ZTogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGUudGlsZS5vbmxvYWQgPSBudWxsO1xyXG5cdH0sXHJcblxyXG5cdF9nZXRab29tRm9yVXJsOiBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMsXHJcblx0XHQgICAgem9vbSA9IHRoaXMuX3RpbGVab29tO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLnpvb21SZXZlcnNlKSB7XHJcblx0XHRcdHpvb20gPSBvcHRpb25zLm1heFpvb20gLSB6b29tO1xyXG5cdFx0fVxyXG5cclxuXHRcdHpvb20gKz0gb3B0aW9ucy56b29tT2Zmc2V0O1xyXG5cclxuXHRcdHJldHVybiBvcHRpb25zLm1heE5hdGl2ZVpvb20gIT09IG51bGwgPyBNYXRoLm1pbih6b29tLCBvcHRpb25zLm1heE5hdGl2ZVpvb20pIDogem9vbTtcclxuXHR9LFxyXG5cclxuXHRfZ2V0U3ViZG9tYWluOiBmdW5jdGlvbiAodGlsZVBvaW50KSB7XHJcblx0XHR2YXIgaW5kZXggPSBNYXRoLmFicyh0aWxlUG9pbnQueCArIHRpbGVQb2ludC55KSAlIHRoaXMub3B0aW9ucy5zdWJkb21haW5zLmxlbmd0aDtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuc3ViZG9tYWluc1tpbmRleF07XHJcblx0fSxcclxuXHJcblx0Ly8gc3RvcHMgbG9hZGluZyBhbGwgdGlsZXMgaW4gdGhlIGJhY2tncm91bmQgbGF5ZXJcclxuXHRfYWJvcnRMb2FkaW5nOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgaSwgdGlsZTtcclxuXHRcdGZvciAoaSBpbiB0aGlzLl90aWxlcykge1xyXG5cdFx0XHRpZiAodGhpcy5fdGlsZXNbaV0uY29vcmRzLnogIT09IHRoaXMuX3RpbGVab29tKSB7XHJcblx0XHRcdFx0dGlsZSA9IHRoaXMuX3RpbGVzW2ldLmVsO1xyXG5cclxuXHRcdFx0XHR0aWxlLm9ubG9hZCA9IEwuVXRpbC5mYWxzZUZuO1xyXG5cdFx0XHRcdHRpbGUub25lcnJvciA9IEwuVXRpbC5mYWxzZUZuO1xyXG5cclxuXHRcdFx0XHRpZiAoIXRpbGUuY29tcGxldGUpIHtcclxuXHRcdFx0XHRcdHRpbGUuc3JjID0gTC5VdGlsLmVtcHR5SW1hZ2VVcmw7XHJcblx0XHRcdFx0XHRMLkRvbVV0aWwucmVtb3ZlKHRpbGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5MLnRpbGVMYXllciA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcclxuXHRyZXR1cm4gbmV3IEwuVGlsZUxheWVyKHVybCwgb3B0aW9ucyk7XHJcbn07XHJcblxuXG5cbi8qXHJcbiAqIEwuVGlsZUxheWVyLldNUyBpcyB1c2VkIGZvciBXTVMgdGlsZSBsYXllcnMuXHJcbiAqL1xyXG5cclxuTC5UaWxlTGF5ZXIuV01TID0gTC5UaWxlTGF5ZXIuZXh0ZW5kKHtcclxuXHJcblx0ZGVmYXVsdFdtc1BhcmFtczoge1xyXG5cdFx0c2VydmljZTogJ1dNUycsXHJcblx0XHRyZXF1ZXN0OiAnR2V0TWFwJyxcclxuXHRcdHZlcnNpb246ICcxLjEuMScsXHJcblx0XHRsYXllcnM6ICcnLFxyXG5cdFx0c3R5bGVzOiAnJyxcclxuXHRcdGZvcm1hdDogJ2ltYWdlL2pwZWcnLFxyXG5cdFx0dHJhbnNwYXJlbnQ6IGZhbHNlXHJcblx0fSxcclxuXHJcblx0b3B0aW9uczoge1xyXG5cdFx0Y3JzOiBudWxsLFxyXG5cdFx0dXBwZXJjYXNlOiBmYWxzZVxyXG5cdH0sXHJcblxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcclxuXHJcblx0XHR0aGlzLl91cmwgPSB1cmw7XHJcblxyXG5cdFx0dmFyIHdtc1BhcmFtcyA9IEwuZXh0ZW5kKHt9LCB0aGlzLmRlZmF1bHRXbXNQYXJhbXMpO1xyXG5cclxuXHRcdC8vIGFsbCBrZXlzIHRoYXQgYXJlIG5vdCBUaWxlTGF5ZXIgb3B0aW9ucyBnbyB0byBXTVMgcGFyYW1zXHJcblx0XHRmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcclxuXHRcdFx0aWYgKCEoaSBpbiB0aGlzLm9wdGlvbnMpKSB7XHJcblx0XHRcdFx0d21zUGFyYW1zW2ldID0gb3B0aW9uc1tpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdG9wdGlvbnMgPSBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XHJcblxyXG5cdFx0d21zUGFyYW1zLndpZHRoID0gd21zUGFyYW1zLmhlaWdodCA9IG9wdGlvbnMudGlsZVNpemUgKiAob3B0aW9ucy5kZXRlY3RSZXRpbmEgJiYgTC5Ccm93c2VyLnJldGluYSA/IDIgOiAxKTtcclxuXHJcblx0XHR0aGlzLndtc1BhcmFtcyA9IHdtc1BhcmFtcztcclxuXHR9LFxyXG5cclxuXHRvbkFkZDogZnVuY3Rpb24gKG1hcCkge1xyXG5cclxuXHRcdHRoaXMuX2NycyA9IHRoaXMub3B0aW9ucy5jcnMgfHwgbWFwLm9wdGlvbnMuY3JzO1xyXG5cdFx0dGhpcy5fd21zVmVyc2lvbiA9IHBhcnNlRmxvYXQodGhpcy53bXNQYXJhbXMudmVyc2lvbik7XHJcblxyXG5cdFx0dmFyIHByb2plY3Rpb25LZXkgPSB0aGlzLl93bXNWZXJzaW9uID49IDEuMyA/ICdjcnMnIDogJ3Nycyc7XHJcblx0XHR0aGlzLndtc1BhcmFtc1twcm9qZWN0aW9uS2V5XSA9IHRoaXMuX2Nycy5jb2RlO1xyXG5cclxuXHRcdEwuVGlsZUxheWVyLnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIG1hcCk7XHJcblx0fSxcclxuXHJcblx0Z2V0VGlsZVVybDogZnVuY3Rpb24gKGNvb3Jkcykge1xyXG5cclxuXHRcdHZhciB0aWxlQm91bmRzID0gdGhpcy5fdGlsZUNvb3Jkc1RvQm91bmRzKGNvb3JkcyksXHJcblx0XHQgICAgbncgPSB0aGlzLl9jcnMucHJvamVjdCh0aWxlQm91bmRzLmdldE5vcnRoV2VzdCgpKSxcclxuXHRcdCAgICBzZSA9IHRoaXMuX2Nycy5wcm9qZWN0KHRpbGVCb3VuZHMuZ2V0U291dGhFYXN0KCkpLFxyXG5cclxuXHRcdCAgICBiYm94ID0gKHRoaXMuX3dtc1ZlcnNpb24gPj0gMS4zICYmIHRoaXMuX2NycyA9PT0gTC5DUlMuRVBTRzQzMjYgP1xyXG5cdFx0XHQgICAgW3NlLnksIG53LngsIG53LnksIHNlLnhdIDpcclxuXHRcdFx0ICAgIFtudy54LCBzZS55LCBzZS54LCBudy55XSkuam9pbignLCcpLFxyXG5cclxuXHRcdCAgICB1cmwgPSBMLlRpbGVMYXllci5wcm90b3R5cGUuZ2V0VGlsZVVybC5jYWxsKHRoaXMsIGNvb3Jkcyk7XHJcblxyXG5cdFx0cmV0dXJuIHVybCArXHJcblx0XHRcdEwuVXRpbC5nZXRQYXJhbVN0cmluZyh0aGlzLndtc1BhcmFtcywgdXJsLCB0aGlzLm9wdGlvbnMudXBwZXJjYXNlKSArXHJcblx0XHRcdCh0aGlzLm9wdGlvbnMudXBwZXJjYXNlID8gJyZCQk9YPScgOiAnJmJib3g9JykgKyBiYm94O1xyXG5cdH0sXHJcblxyXG5cdHNldFBhcmFtczogZnVuY3Rpb24gKHBhcmFtcywgbm9SZWRyYXcpIHtcclxuXHJcblx0XHRMLmV4dGVuZCh0aGlzLndtc1BhcmFtcywgcGFyYW1zKTtcclxuXHJcblx0XHRpZiAoIW5vUmVkcmF3KSB7XHJcblx0XHRcdHRoaXMucmVkcmF3KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG59KTtcclxuXHJcbkwudGlsZUxheWVyLndtcyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcclxuXHRyZXR1cm4gbmV3IEwuVGlsZUxheWVyLldNUyh1cmwsIG9wdGlvbnMpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLkltYWdlT3ZlcmxheSBpcyB1c2VkIHRvIG92ZXJsYXkgaW1hZ2VzIG92ZXIgdGhlIG1hcCAodG8gc3BlY2lmaWMgZ2VvZ3JhcGhpY2FsIGJvdW5kcykuXHJcbiAqL1xyXG5cclxuTC5JbWFnZU92ZXJsYXkgPSBMLkxheWVyLmV4dGVuZCh7XHJcblxyXG5cdG9wdGlvbnM6IHtcclxuXHRcdG9wYWNpdHk6IDEsXHJcblx0XHRhbHQ6ICcnLFxyXG5cdFx0aW50ZXJhY3RpdmU6IGZhbHNlXHJcblxyXG5cdFx0LypcclxuXHRcdGNyb3NzT3JpZ2luOiA8Qm9vbGVhbj4sXHJcblx0XHQqL1xyXG5cdH0sXHJcblxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uICh1cmwsIGJvdW5kcywgb3B0aW9ucykgeyAvLyAoU3RyaW5nLCBMYXRMbmdCb3VuZHMsIE9iamVjdClcclxuXHRcdHRoaXMuX3VybCA9IHVybDtcclxuXHRcdHRoaXMuX2JvdW5kcyA9IEwubGF0TG5nQm91bmRzKGJvdW5kcyk7XHJcblxyXG5cdFx0TC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xyXG5cdH0sXHJcblxyXG5cdG9uQWRkOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAoIXRoaXMuX2ltYWdlKSB7XHJcblx0XHRcdHRoaXMuX2luaXRJbWFnZSgpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMub3B0aW9ucy5vcGFjaXR5IDwgMSkge1xyXG5cdFx0XHRcdHRoaXMuX3VwZGF0ZU9wYWNpdHkoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuaW50ZXJhY3RpdmUpIHtcclxuXHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX2ltYWdlLCAnbGVhZmxldC1pbnRlcmFjdGl2ZScpO1xyXG5cdFx0XHR0aGlzLmFkZEludGVyYWN0aXZlVGFyZ2V0KHRoaXMuX2ltYWdlKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmdldFBhbmUoKS5hcHBlbmRDaGlsZCh0aGlzLl9pbWFnZSk7XHJcblx0XHR0aGlzLl9yZXNldCgpO1xyXG5cdH0sXHJcblxyXG5cdG9uUmVtb3ZlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2ltYWdlKTtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuaW50ZXJhY3RpdmUpIHtcclxuXHRcdFx0dGhpcy5yZW1vdmVJbnRlcmFjdGl2ZVRhcmdldCh0aGlzLl9pbWFnZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0c2V0T3BhY2l0eTogZnVuY3Rpb24gKG9wYWNpdHkpIHtcclxuXHRcdHRoaXMub3B0aW9ucy5vcGFjaXR5ID0gb3BhY2l0eTtcclxuXHJcblx0XHRpZiAodGhpcy5faW1hZ2UpIHtcclxuXHRcdFx0dGhpcy5fdXBkYXRlT3BhY2l0eSgpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c2V0U3R5bGU6IGZ1bmN0aW9uIChzdHlsZU9wdHMpIHtcclxuXHRcdGlmIChzdHlsZU9wdHMub3BhY2l0eSkge1xyXG5cdFx0XHR0aGlzLnNldE9wYWNpdHkoc3R5bGVPcHRzLm9wYWNpdHkpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0YnJpbmdUb0Zyb250OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5fbWFwKSB7XHJcblx0XHRcdEwuRG9tVXRpbC50b0Zyb250KHRoaXMuX2ltYWdlKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGJyaW5nVG9CYWNrOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5fbWFwKSB7XHJcblx0XHRcdEwuRG9tVXRpbC50b0JhY2sodGhpcy5faW1hZ2UpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c2V0VXJsOiBmdW5jdGlvbiAodXJsKSB7XHJcblx0XHR0aGlzLl91cmwgPSB1cmw7XHJcblxyXG5cdFx0aWYgKHRoaXMuX2ltYWdlKSB7XHJcblx0XHRcdHRoaXMuX2ltYWdlLnNyYyA9IHVybDtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNldEJvdW5kczogZnVuY3Rpb24gKGJvdW5kcykge1xyXG5cdFx0dGhpcy5fYm91bmRzID0gYm91bmRzO1xyXG5cclxuXHRcdGlmICh0aGlzLl9tYXApIHtcclxuXHRcdFx0dGhpcy5fcmVzZXQoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGdldEF0dHJpYnV0aW9uOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLmF0dHJpYnV0aW9uO1xyXG5cdH0sXHJcblxyXG5cdGdldEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGV2ZW50cyA9IHtcclxuXHRcdFx0em9vbTogdGhpcy5fcmVzZXQsXHJcblx0XHRcdHZpZXdyZXNldDogdGhpcy5fcmVzZXRcclxuXHRcdH07XHJcblxyXG5cdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xyXG5cdFx0XHRldmVudHMuem9vbWFuaW0gPSB0aGlzLl9hbmltYXRlWm9vbTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZXZlbnRzO1xyXG5cdH0sXHJcblxyXG5cdGdldEJvdW5kczogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2JvdW5kcztcclxuXHR9LFxyXG5cclxuXHRnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5faW1hZ2U7XHJcblx0fSxcclxuXHJcblx0X2luaXRJbWFnZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGltZyA9IHRoaXMuX2ltYWdlID0gTC5Eb21VdGlsLmNyZWF0ZSgnaW1nJyxcclxuXHRcdFx0XHQnbGVhZmxldC1pbWFnZS1sYXllciAnICsgKHRoaXMuX3pvb21BbmltYXRlZCA/ICdsZWFmbGV0LXpvb20tYW5pbWF0ZWQnIDogJycpKTtcclxuXHJcblx0XHRpbWcub25zZWxlY3RzdGFydCA9IEwuVXRpbC5mYWxzZUZuO1xyXG5cdFx0aW1nLm9ubW91c2Vtb3ZlID0gTC5VdGlsLmZhbHNlRm47XHJcblxyXG5cdFx0aW1nLm9ubG9hZCA9IEwuYmluZCh0aGlzLmZpcmUsIHRoaXMsICdsb2FkJyk7XHJcblxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5jcm9zc09yaWdpbikge1xyXG5cdFx0XHRpbWcuY3Jvc3NPcmlnaW4gPSAnJztcclxuXHRcdH1cclxuXHJcblx0XHRpbWcuc3JjID0gdGhpcy5fdXJsO1xyXG5cdFx0aW1nLmFsdCA9IHRoaXMub3B0aW9ucy5hbHQ7XHJcblx0fSxcclxuXHJcblx0X2FuaW1hdGVab29tOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0dmFyIHNjYWxlID0gdGhpcy5fbWFwLmdldFpvb21TY2FsZShlLnpvb20pLFxyXG5cdFx0ICAgIG9mZnNldCA9IHRoaXMuX21hcC5fbGF0TG5nVG9OZXdMYXllclBvaW50KHRoaXMuX2JvdW5kcy5nZXROb3J0aFdlc3QoKSwgZS56b29tLCBlLmNlbnRlcik7XHJcblxyXG5cdFx0TC5Eb21VdGlsLnNldFRyYW5zZm9ybSh0aGlzLl9pbWFnZSwgb2Zmc2V0LCBzY2FsZSk7XHJcblx0fSxcclxuXHJcblx0X3Jlc2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgaW1hZ2UgPSB0aGlzLl9pbWFnZSxcclxuXHRcdCAgICBib3VuZHMgPSBuZXcgTC5Cb3VuZHMoXHJcblx0XHQgICAgICAgIHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fYm91bmRzLmdldE5vcnRoV2VzdCgpKSxcclxuXHRcdCAgICAgICAgdGhpcy5fbWFwLmxhdExuZ1RvTGF5ZXJQb2ludCh0aGlzLl9ib3VuZHMuZ2V0U291dGhFYXN0KCkpKSxcclxuXHRcdCAgICBzaXplID0gYm91bmRzLmdldFNpemUoKTtcclxuXHJcblx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24oaW1hZ2UsIGJvdW5kcy5taW4pO1xyXG5cclxuXHRcdGltYWdlLnN0eWxlLndpZHRoICA9IHNpemUueCArICdweCc7XHJcblx0XHRpbWFnZS5zdHlsZS5oZWlnaHQgPSBzaXplLnkgKyAncHgnO1xyXG5cdH0sXHJcblxyXG5cdF91cGRhdGVPcGFjaXR5OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9pbWFnZSwgdGhpcy5vcHRpb25zLm9wYWNpdHkpO1xyXG5cdH1cclxufSk7XHJcblxyXG5MLmltYWdlT3ZlcmxheSA9IGZ1bmN0aW9uICh1cmwsIGJvdW5kcywgb3B0aW9ucykge1xyXG5cdHJldHVybiBuZXcgTC5JbWFnZU92ZXJsYXkodXJsLCBib3VuZHMsIG9wdGlvbnMpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLkljb24gaXMgYW4gaW1hZ2UtYmFzZWQgaWNvbiBjbGFzcyB0aGF0IHlvdSBjYW4gdXNlIHdpdGggTC5NYXJrZXIgZm9yIGN1c3RvbSBtYXJrZXJzLlxyXG4gKi9cclxuXHJcbkwuSWNvbiA9IEwuQ2xhc3MuZXh0ZW5kKHtcclxuXHQvKlxyXG5cdG9wdGlvbnM6IHtcclxuXHRcdGljb25Vcmw6IChTdHJpbmcpIChyZXF1aXJlZClcclxuXHRcdGljb25SZXRpbmFVcmw6IChTdHJpbmcpIChvcHRpb25hbCwgdXNlZCBmb3IgcmV0aW5hIGRldmljZXMgaWYgZGV0ZWN0ZWQpXHJcblx0XHRpY29uU2l6ZTogKFBvaW50KSAoY2FuIGJlIHNldCB0aHJvdWdoIENTUylcclxuXHRcdGljb25BbmNob3I6IChQb2ludCkgKGNlbnRlcmVkIGJ5IGRlZmF1bHQsIGNhbiBiZSBzZXQgaW4gQ1NTIHdpdGggbmVnYXRpdmUgbWFyZ2lucylcclxuXHRcdHBvcHVwQW5jaG9yOiAoUG9pbnQpIChpZiBub3Qgc3BlY2lmaWVkLCBwb3B1cCBvcGVucyBpbiB0aGUgYW5jaG9yIHBvaW50KVxyXG5cdFx0c2hhZG93VXJsOiAoU3RyaW5nKSAobm8gc2hhZG93IGJ5IGRlZmF1bHQpXHJcblx0XHRzaGFkb3dSZXRpbmFVcmw6IChTdHJpbmcpIChvcHRpb25hbCwgdXNlZCBmb3IgcmV0aW5hIGRldmljZXMgaWYgZGV0ZWN0ZWQpXHJcblx0XHRzaGFkb3dTaXplOiAoUG9pbnQpXHJcblx0XHRzaGFkb3dBbmNob3I6IChQb2ludClcclxuXHRcdGNsYXNzTmFtZTogKFN0cmluZylcclxuXHR9LFxyXG5cdCovXHJcblxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcblx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlSWNvbjogZnVuY3Rpb24gKG9sZEljb24pIHtcclxuXHRcdHJldHVybiB0aGlzLl9jcmVhdGVJY29uKCdpY29uJywgb2xkSWNvbik7XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlU2hhZG93OiBmdW5jdGlvbiAob2xkSWNvbikge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NyZWF0ZUljb24oJ3NoYWRvdycsIG9sZEljb24pO1xyXG5cdH0sXHJcblxyXG5cdF9jcmVhdGVJY29uOiBmdW5jdGlvbiAobmFtZSwgb2xkSWNvbikge1xyXG5cdFx0dmFyIHNyYyA9IHRoaXMuX2dldEljb25VcmwobmFtZSk7XHJcblxyXG5cdFx0aWYgKCFzcmMpIHtcclxuXHRcdFx0aWYgKG5hbWUgPT09ICdpY29uJykge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignaWNvblVybCBub3Qgc2V0IGluIEljb24gb3B0aW9ucyAoc2VlIHRoZSBkb2NzKS4nKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW1nID0gdGhpcy5fY3JlYXRlSW1nKHNyYywgb2xkSWNvbiAmJiBvbGRJY29uLnRhZ05hbWUgPT09ICdJTUcnID8gb2xkSWNvbiA6IG51bGwpO1xyXG5cdFx0dGhpcy5fc2V0SWNvblN0eWxlcyhpbWcsIG5hbWUpO1xyXG5cclxuXHRcdHJldHVybiBpbWc7XHJcblx0fSxcclxuXHJcblx0X3NldEljb25TdHlsZXM6IGZ1bmN0aW9uIChpbWcsIG5hbWUpIHtcclxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zLFxyXG5cdFx0ICAgIHNpemUgPSBMLnBvaW50KG9wdGlvbnNbbmFtZSArICdTaXplJ10pLFxyXG5cdFx0ICAgIGFuY2hvciA9IEwucG9pbnQobmFtZSA9PT0gJ3NoYWRvdycgJiYgb3B0aW9ucy5zaGFkb3dBbmNob3IgfHwgb3B0aW9ucy5pY29uQW5jaG9yIHx8XHJcblx0XHQgICAgICAgICAgICBzaXplICYmIHNpemUuZGl2aWRlQnkoMiwgdHJ1ZSkpO1xyXG5cclxuXHRcdGltZy5jbGFzc05hbWUgPSAnbGVhZmxldC1tYXJrZXItJyArIG5hbWUgKyAnICcgKyAob3B0aW9ucy5jbGFzc05hbWUgfHwgJycpO1xyXG5cclxuXHRcdGlmIChhbmNob3IpIHtcclxuXHRcdFx0aW1nLnN0eWxlLm1hcmdpbkxlZnQgPSAoLWFuY2hvci54KSArICdweCc7XHJcblx0XHRcdGltZy5zdHlsZS5tYXJnaW5Ub3AgID0gKC1hbmNob3IueSkgKyAncHgnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChzaXplKSB7XHJcblx0XHRcdGltZy5zdHlsZS53aWR0aCAgPSBzaXplLnggKyAncHgnO1xyXG5cdFx0XHRpbWcuc3R5bGUuaGVpZ2h0ID0gc2l6ZS55ICsgJ3B4JztcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRfY3JlYXRlSW1nOiBmdW5jdGlvbiAoc3JjLCBlbCkge1xyXG5cdFx0ZWwgPSBlbCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuXHRcdGVsLnNyYyA9IHNyYztcclxuXHRcdHJldHVybiBlbDtcclxuXHR9LFxyXG5cclxuXHRfZ2V0SWNvblVybDogZnVuY3Rpb24gKG5hbWUpIHtcclxuXHRcdHJldHVybiBMLkJyb3dzZXIucmV0aW5hICYmIHRoaXMub3B0aW9uc1tuYW1lICsgJ1JldGluYVVybCddIHx8IHRoaXMub3B0aW9uc1tuYW1lICsgJ1VybCddO1xyXG5cdH1cclxufSk7XHJcblxyXG5MLmljb24gPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdHJldHVybiBuZXcgTC5JY29uKG9wdGlvbnMpO1xyXG59O1xyXG5cblxuXG4vKlxuICogTC5JY29uLkRlZmF1bHQgaXMgdGhlIGJsdWUgbWFya2VyIGljb24gdXNlZCBieSBkZWZhdWx0IGluIExlYWZsZXQuXG4gKi9cblxuTC5JY29uLkRlZmF1bHQgPSBMLkljb24uZXh0ZW5kKHtcblxuXHRvcHRpb25zOiB7XG5cdFx0aWNvblNpemU6ICAgIFsyNSwgNDFdLFxuXHRcdGljb25BbmNob3I6ICBbMTIsIDQxXSxcblx0XHRwb3B1cEFuY2hvcjogWzEsIC0zNF0sXG5cdFx0c2hhZG93U2l6ZTogIFs0MSwgNDFdXG5cdH0sXG5cblx0X2dldEljb25Vcmw6IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0dmFyIGtleSA9IG5hbWUgKyAnVXJsJztcblxuXHRcdGlmICh0aGlzLm9wdGlvbnNba2V5XSkge1xuXHRcdFx0cmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuXHRcdH1cblxuXHRcdHZhciBwYXRoID0gTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoO1xuXG5cdFx0aWYgKCFwYXRoKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkblxcJ3QgYXV0b2RldGVjdCBMLkljb24uRGVmYXVsdC5pbWFnZVBhdGgsIHNldCBpdCBtYW51YWxseS4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcGF0aCArICcvbWFya2VyLScgKyBuYW1lICsgKEwuQnJvd3Nlci5yZXRpbmEgJiYgbmFtZSA9PT0gJ2ljb24nID8gJy0yeCcgOiAnJykgKyAnLnBuZyc7XG5cdH1cbn0pO1xuXG5MLkljb24uRGVmYXVsdC5pbWFnZVBhdGggPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSxcblx0ICAgIGxlYWZsZXRSZSA9IC9bXFwvXl1sZWFmbGV0W1xcLVxcLl9dPyhbXFx3XFwtXFwuX10qKVxcLmpzXFw/Py87XG5cblx0dmFyIGksIGxlbiwgc3JjLCBwYXRoO1xuXG5cdGZvciAoaSA9IDAsIGxlbiA9IHNjcmlwdHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRzcmMgPSBzY3JpcHRzW2ldLnNyYyB8fCAnJztcblxuXHRcdGlmIChzcmMubWF0Y2gobGVhZmxldFJlKSkge1xuXHRcdFx0cGF0aCA9IHNyYy5zcGxpdChsZWFmbGV0UmUpWzBdO1xuXHRcdFx0cmV0dXJuIChwYXRoID8gcGF0aCArICcvJyA6ICcnKSArICdpbWFnZXMnO1xuXHRcdH1cblx0fVxufSgpKTtcblxuXG5cbi8qXHJcbiAqIEwuTWFya2VyIGlzIHVzZWQgdG8gZGlzcGxheSBjbGlja2FibGUvZHJhZ2dhYmxlIGljb25zIG9uIHRoZSBtYXAuXHJcbiAqL1xyXG5cclxuTC5NYXJrZXIgPSBMLkxheWVyLmV4dGVuZCh7XHJcblxyXG5cdG9wdGlvbnM6IHtcclxuXHRcdHBhbmU6ICdtYXJrZXJQYW5lJyxcclxuXHRcdG5vbkJ1YmJsaW5nRXZlbnRzOiBbJ2NsaWNrJywgJ2RibGNsaWNrJywgJ21vdXNlb3ZlcicsICdtb3VzZW91dCcsICdjb250ZXh0bWVudSddLFxyXG5cclxuXHRcdGljb246IG5ldyBMLkljb24uRGVmYXVsdCgpLFxyXG5cdFx0Ly8gdGl0bGU6ICcnLFxyXG5cdFx0Ly8gYWx0OiAnJyxcclxuXHRcdGludGVyYWN0aXZlOiB0cnVlLFxyXG5cdFx0Ly8gZHJhZ2dhYmxlOiBmYWxzZSxcclxuXHRcdGtleWJvYXJkOiB0cnVlLFxyXG5cdFx0ekluZGV4T2Zmc2V0OiAwLFxyXG5cdFx0b3BhY2l0eTogMSxcclxuXHRcdC8vIHJpc2VPbkhvdmVyOiBmYWxzZSxcclxuXHRcdHJpc2VPZmZzZXQ6IDI1MFxyXG5cdH0sXHJcblxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChsYXRsbmcsIG9wdGlvbnMpIHtcclxuXHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcclxuXHRcdHRoaXMuX2xhdGxuZyA9IEwubGF0TG5nKGxhdGxuZyk7XHJcblx0fSxcclxuXHJcblx0b25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcclxuXHRcdHRoaXMuX3pvb21BbmltYXRlZCA9IHRoaXMuX3pvb21BbmltYXRlZCAmJiBtYXAub3B0aW9ucy5tYXJrZXJab29tQW5pbWF0aW9uO1xyXG5cclxuXHRcdHRoaXMuX2luaXRJY29uKCk7XHJcblx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdH0sXHJcblxyXG5cdG9uUmVtb3ZlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5kcmFnZ2luZyAmJiB0aGlzLmRyYWdnaW5nLmVuYWJsZWQoKSkge1xyXG5cdFx0XHR0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5kcmFnZ2luZy5yZW1vdmVIb29rcygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX3JlbW92ZUljb24oKTtcclxuXHRcdHRoaXMuX3JlbW92ZVNoYWRvdygpO1xyXG5cdH0sXHJcblxyXG5cdGdldEV2ZW50czogZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGV2ZW50cyA9IHtcclxuXHRcdFx0em9vbTogdGhpcy51cGRhdGUsXHJcblx0XHRcdHZpZXdyZXNldDogdGhpcy51cGRhdGVcclxuXHRcdH07XHJcblxyXG5cdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xyXG5cdFx0XHRldmVudHMuem9vbWFuaW0gPSB0aGlzLl9hbmltYXRlWm9vbTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZXZlbnRzO1xyXG5cdH0sXHJcblxyXG5cdGdldExhdExuZzogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2xhdGxuZztcclxuXHR9LFxyXG5cclxuXHRzZXRMYXRMbmc6IGZ1bmN0aW9uIChsYXRsbmcpIHtcclxuXHRcdHZhciBvbGRMYXRMbmcgPSB0aGlzLl9sYXRsbmc7XHJcblx0XHR0aGlzLl9sYXRsbmcgPSBMLmxhdExuZyhsYXRsbmcpO1xyXG5cdFx0dGhpcy51cGRhdGUoKTtcclxuXHRcdHJldHVybiB0aGlzLmZpcmUoJ21vdmUnLCB7b2xkTGF0TG5nOiBvbGRMYXRMbmcsIGxhdGxuZzogdGhpcy5fbGF0bG5nfSk7XHJcblx0fSxcclxuXHJcblx0c2V0WkluZGV4T2Zmc2V0OiBmdW5jdGlvbiAob2Zmc2V0KSB7XHJcblx0XHR0aGlzLm9wdGlvbnMuekluZGV4T2Zmc2V0ID0gb2Zmc2V0O1xyXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKCk7XHJcblx0fSxcclxuXHJcblx0c2V0SWNvbjogZnVuY3Rpb24gKGljb24pIHtcclxuXHJcblx0XHR0aGlzLm9wdGlvbnMuaWNvbiA9IGljb247XHJcblxyXG5cdFx0aWYgKHRoaXMuX21hcCkge1xyXG5cdFx0XHR0aGlzLl9pbml0SWNvbigpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLl9wb3B1cCkge1xyXG5cdFx0XHR0aGlzLmJpbmRQb3B1cCh0aGlzLl9wb3B1cCwgdGhpcy5fcG9wdXAub3B0aW9ucyk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0Z2V0RWxlbWVudDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2ljb247XHJcblx0fSxcclxuXHJcblx0dXBkYXRlOiBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKHRoaXMuX2ljb24pIHtcclxuXHRcdFx0dmFyIHBvcyA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fbGF0bG5nKS5yb3VuZCgpO1xyXG5cdFx0XHR0aGlzLl9zZXRQb3MocG9zKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRfaW5pdEljb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zLFxyXG5cdFx0ICAgIGNsYXNzVG9BZGQgPSAnbGVhZmxldC16b29tLScgKyAodGhpcy5fem9vbUFuaW1hdGVkID8gJ2FuaW1hdGVkJyA6ICdoaWRlJyk7XHJcblxyXG5cdFx0dmFyIGljb24gPSBvcHRpb25zLmljb24uY3JlYXRlSWNvbih0aGlzLl9pY29uKSxcclxuXHRcdCAgICBhZGRJY29uID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gaWYgd2UncmUgbm90IHJldXNpbmcgdGhlIGljb24sIHJlbW92ZSB0aGUgb2xkIG9uZSBhbmQgaW5pdCBuZXcgb25lXHJcblx0XHRpZiAoaWNvbiAhPT0gdGhpcy5faWNvbikge1xyXG5cdFx0XHRpZiAodGhpcy5faWNvbikge1xyXG5cdFx0XHRcdHRoaXMuX3JlbW92ZUljb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRhZGRJY29uID0gdHJ1ZTtcclxuXHJcblx0XHRcdGlmIChvcHRpb25zLnRpdGxlKSB7XHJcblx0XHRcdFx0aWNvbi50aXRsZSA9IG9wdGlvbnMudGl0bGU7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKG9wdGlvbnMuYWx0KSB7XHJcblx0XHRcdFx0aWNvbi5hbHQgPSBvcHRpb25zLmFsdDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyhpY29uLCBjbGFzc1RvQWRkKTtcclxuXHJcblx0XHRpZiAob3B0aW9ucy5rZXlib2FyZCkge1xyXG5cdFx0XHRpY29uLnRhYkluZGV4ID0gJzAnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX2ljb24gPSBpY29uO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLnJpc2VPbkhvdmVyKSB7XHJcblx0XHRcdHRoaXMub24oe1xyXG5cdFx0XHRcdG1vdXNlb3ZlcjogdGhpcy5fYnJpbmdUb0Zyb250LFxyXG5cdFx0XHRcdG1vdXNlb3V0OiB0aGlzLl9yZXNldFpJbmRleFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbmV3U2hhZG93ID0gb3B0aW9ucy5pY29uLmNyZWF0ZVNoYWRvdyh0aGlzLl9zaGFkb3cpLFxyXG5cdFx0ICAgIGFkZFNoYWRvdyA9IGZhbHNlO1xyXG5cclxuXHRcdGlmIChuZXdTaGFkb3cgIT09IHRoaXMuX3NoYWRvdykge1xyXG5cdFx0XHR0aGlzLl9yZW1vdmVTaGFkb3coKTtcclxuXHRcdFx0YWRkU2hhZG93ID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAobmV3U2hhZG93KSB7XHJcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyhuZXdTaGFkb3csIGNsYXNzVG9BZGQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5fc2hhZG93ID0gbmV3U2hhZG93O1xyXG5cclxuXHJcblx0XHRpZiAob3B0aW9ucy5vcGFjaXR5IDwgMSkge1xyXG5cdFx0XHR0aGlzLl91cGRhdGVPcGFjaXR5KCk7XHJcblx0XHR9XHJcblxyXG5cclxuXHRcdGlmIChhZGRJY29uKSB7XHJcblx0XHRcdHRoaXMuZ2V0UGFuZSgpLmFwcGVuZENoaWxkKHRoaXMuX2ljb24pO1xyXG5cdFx0XHR0aGlzLl9pbml0SW50ZXJhY3Rpb24oKTtcclxuXHRcdH1cclxuXHRcdGlmIChuZXdTaGFkb3cgJiYgYWRkU2hhZG93KSB7XHJcblx0XHRcdHRoaXMuZ2V0UGFuZSgnc2hhZG93UGFuZScpLmFwcGVuZENoaWxkKHRoaXMuX3NoYWRvdyk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X3JlbW92ZUljb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMucmlzZU9uSG92ZXIpIHtcclxuXHRcdFx0dGhpcy5vZmYoe1xyXG5cdFx0XHRcdG1vdXNlb3ZlcjogdGhpcy5fYnJpbmdUb0Zyb250LFxyXG5cdFx0XHRcdG1vdXNlb3V0OiB0aGlzLl9yZXNldFpJbmRleFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2ljb24pO1xyXG5cdFx0dGhpcy5yZW1vdmVJbnRlcmFjdGl2ZVRhcmdldCh0aGlzLl9pY29uKTtcclxuXHJcblx0XHR0aGlzLl9pY29uID0gbnVsbDtcclxuXHR9LFxyXG5cclxuXHRfcmVtb3ZlU2hhZG93OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5fc2hhZG93KSB7XHJcblx0XHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fc2hhZG93KTtcclxuXHRcdH1cclxuXHRcdHRoaXMuX3NoYWRvdyA9IG51bGw7XHJcblx0fSxcclxuXHJcblx0X3NldFBvczogZnVuY3Rpb24gKHBvcykge1xyXG5cdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX2ljb24sIHBvcyk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX3NoYWRvdykge1xyXG5cdFx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fc2hhZG93LCBwb3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX3pJbmRleCA9IHBvcy55ICsgdGhpcy5vcHRpb25zLnpJbmRleE9mZnNldDtcclxuXHJcblx0XHR0aGlzLl9yZXNldFpJbmRleCgpO1xyXG5cdH0sXHJcblxyXG5cdF91cGRhdGVaSW5kZXg6IGZ1bmN0aW9uIChvZmZzZXQpIHtcclxuXHRcdHRoaXMuX2ljb24uc3R5bGUuekluZGV4ID0gdGhpcy5fekluZGV4ICsgb2Zmc2V0O1xyXG5cdH0sXHJcblxyXG5cdF9hbmltYXRlWm9vbTogZnVuY3Rpb24gKG9wdCkge1xyXG5cdFx0dmFyIHBvcyA9IHRoaXMuX21hcC5fbGF0TG5nVG9OZXdMYXllclBvaW50KHRoaXMuX2xhdGxuZywgb3B0Lnpvb20sIG9wdC5jZW50ZXIpLnJvdW5kKCk7XHJcblxyXG5cdFx0dGhpcy5fc2V0UG9zKHBvcyk7XHJcblx0fSxcclxuXHJcblx0X2luaXRJbnRlcmFjdGlvbjogZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmICghdGhpcy5vcHRpb25zLmludGVyYWN0aXZlKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9pY29uLCAnbGVhZmxldC1pbnRlcmFjdGl2ZScpO1xyXG5cclxuXHRcdHRoaXMuYWRkSW50ZXJhY3RpdmVUYXJnZXQodGhpcy5faWNvbik7XHJcblxyXG5cdFx0aWYgKEwuSGFuZGxlci5NYXJrZXJEcmFnKSB7XHJcblx0XHRcdHZhciBkcmFnZ2FibGUgPSB0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlO1xyXG5cdFx0XHRpZiAodGhpcy5kcmFnZ2luZykge1xyXG5cdFx0XHRcdGRyYWdnYWJsZSA9IHRoaXMuZHJhZ2dpbmcuZW5hYmxlZCgpO1xyXG5cdFx0XHRcdHRoaXMuZHJhZ2dpbmcuZGlzYWJsZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmRyYWdnaW5nID0gbmV3IEwuSGFuZGxlci5NYXJrZXJEcmFnKHRoaXMpO1xyXG5cclxuXHRcdFx0aWYgKGRyYWdnYWJsZSkge1xyXG5cdFx0XHRcdHRoaXMuZHJhZ2dpbmcuZW5hYmxlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRzZXRPcGFjaXR5OiBmdW5jdGlvbiAob3BhY2l0eSkge1xyXG5cdFx0dGhpcy5vcHRpb25zLm9wYWNpdHkgPSBvcGFjaXR5O1xyXG5cdFx0aWYgKHRoaXMuX21hcCkge1xyXG5cdFx0XHR0aGlzLl91cGRhdGVPcGFjaXR5KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0X3VwZGF0ZU9wYWNpdHk6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBvcGFjaXR5ID0gdGhpcy5vcHRpb25zLm9wYWNpdHk7XHJcblxyXG5cdFx0TC5Eb21VdGlsLnNldE9wYWNpdHkodGhpcy5faWNvbiwgb3BhY2l0eSk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX3NoYWRvdykge1xyXG5cdFx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9zaGFkb3csIG9wYWNpdHkpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9icmluZ1RvRnJvbnQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHRoaXMuX3VwZGF0ZVpJbmRleCh0aGlzLm9wdGlvbnMucmlzZU9mZnNldCk7XHJcblx0fSxcclxuXHJcblx0X3Jlc2V0WkluZGV4OiBmdW5jdGlvbiAoKSB7XHJcblx0XHR0aGlzLl91cGRhdGVaSW5kZXgoMCk7XHJcblx0fVxyXG59KTtcclxuXHJcbkwubWFya2VyID0gZnVuY3Rpb24gKGxhdGxuZywgb3B0aW9ucykge1xyXG5cdHJldHVybiBuZXcgTC5NYXJrZXIobGF0bG5nLCBvcHRpb25zKTtcclxufTtcclxuXG5cblxuLypcbiAqIEwuRGl2SWNvbiBpcyBhIGxpZ2h0d2VpZ2h0IEhUTUwtYmFzZWQgaWNvbiBjbGFzcyAoYXMgb3Bwb3NlZCB0byB0aGUgaW1hZ2UtYmFzZWQgTC5JY29uKVxuICogdG8gdXNlIHdpdGggTC5NYXJrZXIuXG4gKi9cblxuTC5EaXZJY29uID0gTC5JY29uLmV4dGVuZCh7XG5cdG9wdGlvbnM6IHtcblx0XHRpY29uU2l6ZTogWzEyLCAxMl0sIC8vIGFsc28gY2FuIGJlIHNldCB0aHJvdWdoIENTU1xuXHRcdC8qXG5cdFx0aWNvbkFuY2hvcjogKFBvaW50KVxuXHRcdHBvcHVwQW5jaG9yOiAoUG9pbnQpXG5cdFx0aHRtbDogKFN0cmluZylcblx0XHRiZ1BvczogKFBvaW50KVxuXHRcdCovXG5cdFx0Y2xhc3NOYW1lOiAnbGVhZmxldC1kaXYtaWNvbicsXG5cdFx0aHRtbDogZmFsc2Vcblx0fSxcblxuXHRjcmVhdGVJY29uOiBmdW5jdGlvbiAob2xkSWNvbikge1xuXHRcdHZhciBkaXYgPSAob2xkSWNvbiAmJiBvbGRJY29uLnRhZ05hbWUgPT09ICdESVYnKSA/IG9sZEljb24gOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcblx0XHQgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdGRpdi5pbm5lckhUTUwgPSBvcHRpb25zLmh0bWwgIT09IGZhbHNlID8gb3B0aW9ucy5odG1sIDogJyc7XG5cblx0XHRpZiAob3B0aW9ucy5iZ1Bvcykge1xuXHRcdFx0ZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbiA9ICgtb3B0aW9ucy5iZ1Bvcy54KSArICdweCAnICsgKC1vcHRpb25zLmJnUG9zLnkpICsgJ3B4Jztcblx0XHR9XG5cdFx0dGhpcy5fc2V0SWNvblN0eWxlcyhkaXYsICdpY29uJyk7XG5cblx0XHRyZXR1cm4gZGl2O1xuXHR9LFxuXG5cdGNyZWF0ZVNoYWRvdzogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG59KTtcblxuTC5kaXZJY29uID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0cmV0dXJuIG5ldyBMLkRpdkljb24ob3B0aW9ucyk7XG59O1xuXG5cblxuLypcclxuICogTC5Qb3B1cCBpcyB1c2VkIGZvciBkaXNwbGF5aW5nIHBvcHVwcyBvbiB0aGUgbWFwLlxyXG4gKi9cclxuXHJcbkwuTWFwLm1lcmdlT3B0aW9ucyh7XHJcblx0Y2xvc2VQb3B1cE9uQ2xpY2s6IHRydWVcclxufSk7XHJcblxyXG5MLlBvcHVwID0gTC5MYXllci5leHRlbmQoe1xyXG5cclxuXHRvcHRpb25zOiB7XHJcblx0XHRwYW5lOiAncG9wdXBQYW5lJyxcclxuXHJcblx0XHRtaW5XaWR0aDogNTAsXHJcblx0XHRtYXhXaWR0aDogMzAwLFxyXG5cdFx0Ly8gbWF4SGVpZ2h0OiA8TnVtYmVyPixcclxuXHRcdG9mZnNldDogWzAsIDddLFxyXG5cclxuXHRcdGF1dG9QYW46IHRydWUsXHJcblx0XHRhdXRvUGFuUGFkZGluZzogWzUsIDVdLFxyXG5cdFx0Ly8gYXV0b1BhblBhZGRpbmdUb3BMZWZ0OiA8UG9pbnQ+LFxyXG5cdFx0Ly8gYXV0b1BhblBhZGRpbmdCb3R0b21SaWdodDogPFBvaW50PixcclxuXHJcblx0XHRjbG9zZUJ1dHRvbjogdHJ1ZSxcclxuXHRcdGF1dG9DbG9zZTogdHJ1ZSxcclxuXHRcdC8vIGtlZXBJblZpZXc6IGZhbHNlLFxyXG5cdFx0Ly8gY2xhc3NOYW1lOiAnJyxcclxuXHRcdHpvb21BbmltYXRpb246IHRydWVcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucywgc291cmNlKSB7XHJcblx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XHJcblxyXG5cdFx0dGhpcy5fc291cmNlID0gc291cmNlO1xyXG5cdH0sXHJcblxyXG5cdG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XHJcblx0XHR0aGlzLl96b29tQW5pbWF0ZWQgPSB0aGlzLl96b29tQW5pbWF0ZWQgJiYgdGhpcy5vcHRpb25zLnpvb21BbmltYXRpb247XHJcblxyXG5cdFx0aWYgKCF0aGlzLl9jb250YWluZXIpIHtcclxuXHRcdFx0dGhpcy5faW5pdExheW91dCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChtYXAuX2ZhZGVBbmltYXRlZCkge1xyXG5cdFx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsIDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNsZWFyVGltZW91dCh0aGlzLl9yZW1vdmVUaW1lb3V0KTtcclxuXHRcdHRoaXMuZ2V0UGFuZSgpLmFwcGVuZENoaWxkKHRoaXMuX2NvbnRhaW5lcik7XHJcblx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cclxuXHRcdGlmIChtYXAuX2ZhZGVBbmltYXRlZCkge1xyXG5cdFx0XHRMLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1hcC5maXJlKCdwb3B1cG9wZW4nLCB7cG9wdXA6IHRoaXN9KTtcclxuXHJcblx0XHRpZiAodGhpcy5fc291cmNlKSB7XHJcblx0XHRcdHRoaXMuX3NvdXJjZS5maXJlKCdwb3B1cG9wZW4nLCB7cG9wdXA6IHRoaXN9LCB0cnVlKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRvcGVuT246IGZ1bmN0aW9uIChtYXApIHtcclxuXHRcdG1hcC5vcGVuUG9wdXAodGhpcyk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRvblJlbW92ZTogZnVuY3Rpb24gKG1hcCkge1xyXG5cdFx0aWYgKG1hcC5fZmFkZUFuaW1hdGVkKSB7XHJcblx0XHRcdEwuRG9tVXRpbC5zZXRPcGFjaXR5KHRoaXMuX2NvbnRhaW5lciwgMCk7XHJcblx0XHRcdHRoaXMuX3JlbW92ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KEwuYmluZChMLkRvbVV0aWwucmVtb3ZlLCBMLkRvbVV0aWwsIHRoaXMuX2NvbnRhaW5lciksIDIwMCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2NvbnRhaW5lcik7XHJcblx0XHR9XHJcblxyXG5cdFx0bWFwLmZpcmUoJ3BvcHVwY2xvc2UnLCB7cG9wdXA6IHRoaXN9KTtcclxuXHJcblx0XHRpZiAodGhpcy5fc291cmNlKSB7XHJcblx0XHRcdHRoaXMuX3NvdXJjZS5maXJlKCdwb3B1cGNsb3NlJywge3BvcHVwOiB0aGlzfSwgdHJ1ZSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Z2V0TGF0TG5nOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fbGF0bG5nO1xyXG5cdH0sXHJcblxyXG5cdHNldExhdExuZzogZnVuY3Rpb24gKGxhdGxuZykge1xyXG5cdFx0dGhpcy5fbGF0bG5nID0gTC5sYXRMbmcobGF0bG5nKTtcclxuXHRcdGlmICh0aGlzLl9tYXApIHtcclxuXHRcdFx0dGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcclxuXHRcdFx0dGhpcy5fYWRqdXN0UGFuKCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRnZXRDb250ZW50OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fY29udGVudDtcclxuXHR9LFxyXG5cclxuXHRzZXRDb250ZW50OiBmdW5jdGlvbiAoY29udGVudCkge1xyXG5cdFx0dGhpcy5fY29udGVudCA9IGNvbnRlbnQ7XHJcblx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0Z2V0RWxlbWVudDogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcclxuXHR9LFxyXG5cclxuXHR1cGRhdGU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICghdGhpcy5fbWFwKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHRoaXMuX2NvbnRhaW5lci5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XHJcblxyXG5cdFx0dGhpcy5fdXBkYXRlQ29udGVudCgpO1xyXG5cdFx0dGhpcy5fdXBkYXRlTGF5b3V0KCk7XHJcblx0XHR0aGlzLl91cGRhdGVQb3NpdGlvbigpO1xyXG5cclxuXHRcdHRoaXMuX2NvbnRhaW5lci5zdHlsZS52aXNpYmlsaXR5ID0gJyc7XHJcblxyXG5cdFx0dGhpcy5fYWRqdXN0UGFuKCk7XHJcblx0fSxcclxuXHJcblx0Z2V0RXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgZXZlbnRzID0ge1xyXG5cdFx0XHR6b29tOiB0aGlzLl91cGRhdGVQb3NpdGlvbixcclxuXHRcdFx0dmlld3Jlc2V0OiB0aGlzLl91cGRhdGVQb3NpdGlvblxyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAodGhpcy5fem9vbUFuaW1hdGVkKSB7XHJcblx0XHRcdGV2ZW50cy56b29tYW5pbSA9IHRoaXMuX2FuaW1hdGVab29tO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCdjbG9zZU9uQ2xpY2snIGluIHRoaXMub3B0aW9ucyA/IHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgOiB0aGlzLl9tYXAub3B0aW9ucy5jbG9zZVBvcHVwT25DbGljaykge1xyXG5cdFx0XHRldmVudHMucHJlY2xpY2sgPSB0aGlzLl9jbG9zZTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMua2VlcEluVmlldykge1xyXG5cdFx0XHRldmVudHMubW92ZWVuZCA9IHRoaXMuX2FkanVzdFBhbjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBldmVudHM7XHJcblx0fSxcclxuXHJcblx0aXNPcGVuOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gISF0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLmhhc0xheWVyKHRoaXMpO1xyXG5cdH0sXHJcblxyXG5cdGJyaW5nVG9Gcm9udDogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKHRoaXMuX21hcCkge1xyXG5cdFx0XHRMLkRvbVV0aWwudG9Gcm9udCh0aGlzLl9jb250YWluZXIpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0YnJpbmdUb0JhY2s6IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICh0aGlzLl9tYXApIHtcclxuXHRcdFx0TC5Eb21VdGlsLnRvQmFjayh0aGlzLl9jb250YWluZXIpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0X2Nsb3NlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5fbWFwKSB7XHJcblx0XHRcdHRoaXMuX21hcC5jbG9zZVBvcHVwKHRoaXMpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9pbml0TGF5b3V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgcHJlZml4ID0gJ2xlYWZsZXQtcG9wdXAnLFxyXG5cdFx0ICAgIGNvbnRhaW5lciA9IHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXHJcblx0XHRcdHByZWZpeCArICcgJyArICh0aGlzLm9wdGlvbnMuY2xhc3NOYW1lIHx8ICcnKSArXHJcblx0XHRcdCcgbGVhZmxldC16b29tLScgKyAodGhpcy5fem9vbUFuaW1hdGVkID8gJ2FuaW1hdGVkJyA6ICdoaWRlJykpO1xyXG5cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuY2xvc2VCdXR0b24pIHtcclxuXHRcdFx0dmFyIGNsb3NlQnV0dG9uID0gdGhpcy5fY2xvc2VCdXR0b24gPSBMLkRvbVV0aWwuY3JlYXRlKCdhJywgcHJlZml4ICsgJy1jbG9zZS1idXR0b24nLCBjb250YWluZXIpO1xyXG5cdFx0XHRjbG9zZUJ1dHRvbi5ocmVmID0gJyNjbG9zZSc7XHJcblx0XHRcdGNsb3NlQnV0dG9uLmlubmVySFRNTCA9ICcmIzIxNTsnO1xyXG5cclxuXHRcdFx0TC5Eb21FdmVudC5vbihjbG9zZUJ1dHRvbiwgJ2NsaWNrJywgdGhpcy5fb25DbG9zZUJ1dHRvbkNsaWNrLCB0aGlzKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgd3JhcHBlciA9IHRoaXMuX3dyYXBwZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCBwcmVmaXggKyAnLWNvbnRlbnQtd3JhcHBlcicsIGNvbnRhaW5lcik7XHJcblx0XHR0aGlzLl9jb250ZW50Tm9kZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIHByZWZpeCArICctY29udGVudCcsIHdyYXBwZXIpO1xyXG5cclxuXHRcdEwuRG9tRXZlbnRcclxuXHRcdFx0LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKHdyYXBwZXIpXHJcblx0XHRcdC5kaXNhYmxlU2Nyb2xsUHJvcGFnYXRpb24odGhpcy5fY29udGVudE5vZGUpXHJcblx0XHRcdC5vbih3cmFwcGVyLCAnY29udGV4dG1lbnUnLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbik7XHJcblxyXG5cdFx0dGhpcy5fdGlwQ29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgcHJlZml4ICsgJy10aXAtY29udGFpbmVyJywgY29udGFpbmVyKTtcclxuXHRcdHRoaXMuX3RpcCA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIHByZWZpeCArICctdGlwJywgdGhpcy5fdGlwQ29udGFpbmVyKTtcclxuXHR9LFxyXG5cclxuXHRfdXBkYXRlQ29udGVudDogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9jb250ZW50KSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHZhciBub2RlID0gdGhpcy5fY29udGVudE5vZGU7XHJcblx0XHR2YXIgY29udGVudCA9ICh0eXBlb2YgdGhpcy5fY29udGVudCA9PT0gJ2Z1bmN0aW9uJykgPyB0aGlzLl9jb250ZW50KHRoaXMuX3NvdXJjZSB8fCB0aGlzKSA6IHRoaXMuX2NvbnRlbnQ7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xyXG5cdFx0XHRub2RlLmlubmVySFRNTCA9IGNvbnRlbnQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR3aGlsZSAobm9kZS5oYXNDaGlsZE5vZGVzKCkpIHtcclxuXHRcdFx0XHRub2RlLnJlbW92ZUNoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0bm9kZS5hcHBlbmRDaGlsZChjb250ZW50KTtcclxuXHRcdH1cclxuXHRcdHRoaXMuZmlyZSgnY29udGVudHVwZGF0ZScpO1xyXG5cdH0sXHJcblxyXG5cdF91cGRhdGVMYXlvdXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBjb250YWluZXIgPSB0aGlzLl9jb250ZW50Tm9kZSxcclxuXHRcdCAgICBzdHlsZSA9IGNvbnRhaW5lci5zdHlsZTtcclxuXHJcblx0XHRzdHlsZS53aWR0aCA9ICcnO1xyXG5cdFx0c3R5bGUud2hpdGVTcGFjZSA9ICdub3dyYXAnO1xyXG5cclxuXHRcdHZhciB3aWR0aCA9IGNvbnRhaW5lci5vZmZzZXRXaWR0aDtcclxuXHRcdHdpZHRoID0gTWF0aC5taW4od2lkdGgsIHRoaXMub3B0aW9ucy5tYXhXaWR0aCk7XHJcblx0XHR3aWR0aCA9IE1hdGgubWF4KHdpZHRoLCB0aGlzLm9wdGlvbnMubWluV2lkdGgpO1xyXG5cclxuXHRcdHN0eWxlLndpZHRoID0gKHdpZHRoICsgMSkgKyAncHgnO1xyXG5cdFx0c3R5bGUud2hpdGVTcGFjZSA9ICcnO1xyXG5cclxuXHRcdHN0eWxlLmhlaWdodCA9ICcnO1xyXG5cclxuXHRcdHZhciBoZWlnaHQgPSBjb250YWluZXIub2Zmc2V0SGVpZ2h0LFxyXG5cdFx0ICAgIG1heEhlaWdodCA9IHRoaXMub3B0aW9ucy5tYXhIZWlnaHQsXHJcblx0XHQgICAgc2Nyb2xsZWRDbGFzcyA9ICdsZWFmbGV0LXBvcHVwLXNjcm9sbGVkJztcclxuXHJcblx0XHRpZiAobWF4SGVpZ2h0ICYmIGhlaWdodCA+IG1heEhlaWdodCkge1xyXG5cdFx0XHRzdHlsZS5oZWlnaHQgPSBtYXhIZWlnaHQgKyAncHgnO1xyXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MoY29udGFpbmVyLCBzY3JvbGxlZENsYXNzKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyhjb250YWluZXIsIHNjcm9sbGVkQ2xhc3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX2NvbnRhaW5lcldpZHRoID0gdGhpcy5fY29udGFpbmVyLm9mZnNldFdpZHRoO1xyXG5cdH0sXHJcblxyXG5cdF91cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9tYXApIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0dmFyIHBvcyA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fbGF0bG5nKSxcclxuXHRcdCAgICBvZmZzZXQgPSBMLnBvaW50KHRoaXMub3B0aW9ucy5vZmZzZXQpO1xyXG5cclxuXHRcdGlmICh0aGlzLl96b29tQW5pbWF0ZWQpIHtcclxuXHRcdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX2NvbnRhaW5lciwgcG9zKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG9mZnNldCA9IG9mZnNldC5hZGQocG9zKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgYm90dG9tID0gdGhpcy5fY29udGFpbmVyQm90dG9tID0gLW9mZnNldC55LFxyXG5cdFx0ICAgIGxlZnQgPSB0aGlzLl9jb250YWluZXJMZWZ0ID0gLU1hdGgucm91bmQodGhpcy5fY29udGFpbmVyV2lkdGggLyAyKSArIG9mZnNldC54O1xyXG5cclxuXHRcdC8vIGJvdHRvbSBwb3NpdGlvbiB0aGUgcG9wdXAgaW4gY2FzZSB0aGUgaGVpZ2h0IG9mIHRoZSBwb3B1cCBjaGFuZ2VzIChpbWFnZXMgbG9hZGluZyBldGMpXHJcblx0XHR0aGlzLl9jb250YWluZXIuc3R5bGUuYm90dG9tID0gYm90dG9tICsgJ3B4JztcclxuXHRcdHRoaXMuX2NvbnRhaW5lci5zdHlsZS5sZWZ0ID0gbGVmdCArICdweCc7XHJcblx0fSxcclxuXHJcblx0X2FuaW1hdGVab29tOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0dmFyIHBvcyA9IHRoaXMuX21hcC5fbGF0TG5nVG9OZXdMYXllclBvaW50KHRoaXMuX2xhdGxuZywgZS56b29tLCBlLmNlbnRlcik7XHJcblx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fY29udGFpbmVyLCBwb3MpO1xyXG5cdH0sXHJcblxyXG5cdF9hZGp1c3RQYW46IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICghdGhpcy5vcHRpb25zLmF1dG9QYW4gfHwgKHRoaXMuX21hcC5fcGFuQW5pbSAmJiB0aGlzLl9tYXAuX3BhbkFuaW0uX2luUHJvZ3Jlc3MpKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXHJcblx0XHQgICAgY29udGFpbmVySGVpZ2h0ID0gdGhpcy5fY29udGFpbmVyLm9mZnNldEhlaWdodCxcclxuXHRcdCAgICBjb250YWluZXJXaWR0aCA9IHRoaXMuX2NvbnRhaW5lcldpZHRoLFxyXG5cdFx0ICAgIGxheWVyUG9zID0gbmV3IEwuUG9pbnQodGhpcy5fY29udGFpbmVyTGVmdCwgLWNvbnRhaW5lckhlaWdodCAtIHRoaXMuX2NvbnRhaW5lckJvdHRvbSk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xyXG5cdFx0XHRsYXllclBvcy5fYWRkKEwuRG9tVXRpbC5nZXRQb3NpdGlvbih0aGlzLl9jb250YWluZXIpKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgY29udGFpbmVyUG9zID0gbWFwLmxheWVyUG9pbnRUb0NvbnRhaW5lclBvaW50KGxheWVyUG9zKSxcclxuXHRcdCAgICBwYWRkaW5nID0gTC5wb2ludCh0aGlzLm9wdGlvbnMuYXV0b1BhblBhZGRpbmcpLFxyXG5cdFx0ICAgIHBhZGRpbmdUTCA9IEwucG9pbnQodGhpcy5vcHRpb25zLmF1dG9QYW5QYWRkaW5nVG9wTGVmdCB8fCBwYWRkaW5nKSxcclxuXHRcdCAgICBwYWRkaW5nQlIgPSBMLnBvaW50KHRoaXMub3B0aW9ucy5hdXRvUGFuUGFkZGluZ0JvdHRvbVJpZ2h0IHx8IHBhZGRpbmcpLFxyXG5cdFx0ICAgIHNpemUgPSBtYXAuZ2V0U2l6ZSgpLFxyXG5cdFx0ICAgIGR4ID0gMCxcclxuXHRcdCAgICBkeSA9IDA7XHJcblxyXG5cdFx0aWYgKGNvbnRhaW5lclBvcy54ICsgY29udGFpbmVyV2lkdGggKyBwYWRkaW5nQlIueCA+IHNpemUueCkgeyAvLyByaWdodFxyXG5cdFx0XHRkeCA9IGNvbnRhaW5lclBvcy54ICsgY29udGFpbmVyV2lkdGggLSBzaXplLnggKyBwYWRkaW5nQlIueDtcclxuXHRcdH1cclxuXHRcdGlmIChjb250YWluZXJQb3MueCAtIGR4IC0gcGFkZGluZ1RMLnggPCAwKSB7IC8vIGxlZnRcclxuXHRcdFx0ZHggPSBjb250YWluZXJQb3MueCAtIHBhZGRpbmdUTC54O1xyXG5cdFx0fVxyXG5cdFx0aWYgKGNvbnRhaW5lclBvcy55ICsgY29udGFpbmVySGVpZ2h0ICsgcGFkZGluZ0JSLnkgPiBzaXplLnkpIHsgLy8gYm90dG9tXHJcblx0XHRcdGR5ID0gY29udGFpbmVyUG9zLnkgKyBjb250YWluZXJIZWlnaHQgLSBzaXplLnkgKyBwYWRkaW5nQlIueTtcclxuXHRcdH1cclxuXHRcdGlmIChjb250YWluZXJQb3MueSAtIGR5IC0gcGFkZGluZ1RMLnkgPCAwKSB7IC8vIHRvcFxyXG5cdFx0XHRkeSA9IGNvbnRhaW5lclBvcy55IC0gcGFkZGluZ1RMLnk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGR4IHx8IGR5KSB7XHJcblx0XHRcdG1hcFxyXG5cdFx0XHQgICAgLmZpcmUoJ2F1dG9wYW5zdGFydCcpXHJcblx0XHRcdCAgICAucGFuQnkoW2R4LCBkeV0pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdF9vbkNsb3NlQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHR0aGlzLl9jbG9zZSgpO1xyXG5cdFx0TC5Eb21FdmVudC5zdG9wKGUpO1xyXG5cdH1cclxufSk7XHJcblxyXG5MLnBvcHVwID0gZnVuY3Rpb24gKG9wdGlvbnMsIHNvdXJjZSkge1xyXG5cdHJldHVybiBuZXcgTC5Qb3B1cChvcHRpb25zLCBzb3VyY2UpO1xyXG59O1xyXG5cclxuXHJcbkwuTWFwLmluY2x1ZGUoe1xyXG5cdG9wZW5Qb3B1cDogZnVuY3Rpb24gKHBvcHVwLCBsYXRsbmcsIG9wdGlvbnMpIHsgLy8gKFBvcHVwKSBvciAoU3RyaW5nIHx8IEhUTUxFbGVtZW50LCBMYXRMbmdbLCBPYmplY3RdKVxyXG5cdFx0aWYgKCEocG9wdXAgaW5zdGFuY2VvZiBMLlBvcHVwKSkge1xyXG5cdFx0XHRwb3B1cCA9IG5ldyBMLlBvcHVwKG9wdGlvbnMpLnNldENvbnRlbnQocG9wdXApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChsYXRsbmcpIHtcclxuXHRcdFx0cG9wdXAuc2V0TGF0TG5nKGxhdGxuZyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFzTGF5ZXIocG9wdXApKSB7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLl9wb3B1cCAmJiB0aGlzLl9wb3B1cC5vcHRpb25zLmF1dG9DbG9zZSkge1xyXG5cdFx0XHR0aGlzLmNsb3NlUG9wdXAoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9wb3B1cCA9IHBvcHVwO1xyXG5cdFx0cmV0dXJuIHRoaXMuYWRkTGF5ZXIocG9wdXApO1xyXG5cdH0sXHJcblxyXG5cdGNsb3NlUG9wdXA6IGZ1bmN0aW9uIChwb3B1cCkge1xyXG5cdFx0aWYgKCFwb3B1cCB8fCBwb3B1cCA9PT0gdGhpcy5fcG9wdXApIHtcclxuXHRcdFx0cG9wdXAgPSB0aGlzLl9wb3B1cDtcclxuXHRcdFx0dGhpcy5fcG9wdXAgPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHBvcHVwKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlTGF5ZXIocG9wdXApO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG59KTtcclxuXG5cblxuLypcbiAqIEFkZHMgcG9wdXAtcmVsYXRlZCBtZXRob2RzIHRvIGFsbCBsYXllcnMuXG4gKi9cblxuTC5MYXllci5pbmNsdWRlKHtcblxuXHRiaW5kUG9wdXA6IGZ1bmN0aW9uIChjb250ZW50LCBvcHRpb25zKSB7XG5cblx0XHRpZiAoY29udGVudCBpbnN0YW5jZW9mIEwuUG9wdXApIHtcblx0XHRcdEwuc2V0T3B0aW9ucyhjb250ZW50LCBvcHRpb25zKTtcblx0XHRcdHRoaXMuX3BvcHVwID0gY29udGVudDtcblx0XHRcdGNvbnRlbnQuX3NvdXJjZSA9IHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICghdGhpcy5fcG9wdXAgfHwgb3B0aW9ucykge1xuXHRcdFx0XHR0aGlzLl9wb3B1cCA9IG5ldyBMLlBvcHVwKG9wdGlvbnMsIHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fcG9wdXAuc2V0Q29udGVudChjb250ZW50KTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuX3BvcHVwSGFuZGxlcnNBZGRlZCkge1xuXHRcdFx0dGhpcy5vbih7XG5cdFx0XHRcdGNsaWNrOiB0aGlzLl9vcGVuUG9wdXAsXG5cdFx0XHRcdHJlbW92ZTogdGhpcy5jbG9zZVBvcHVwLFxuXHRcdFx0XHRtb3ZlOiB0aGlzLl9tb3ZlUG9wdXBcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fcG9wdXBIYW5kbGVyc0FkZGVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBzYXZlIHRoZSBvcmlnaW5hbGx5IHBhc3NlZCBvZmZzZXRcblx0XHR0aGlzLl9vcmlnaW5hbFBvcHVwT2Zmc2V0ID0gdGhpcy5fcG9wdXAub3B0aW9ucy5vZmZzZXQ7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHR1bmJpbmRQb3B1cDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9wb3B1cCkge1xuXHRcdFx0dGhpcy5vZmYoe1xuXHRcdFx0XHRjbGljazogdGhpcy5fb3BlblBvcHVwLFxuXHRcdFx0XHRyZW1vdmU6IHRoaXMuY2xvc2VQb3B1cCxcblx0XHRcdFx0bW92ZTogdGhpcy5fbW92ZVBvcHVwXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3BvcHVwSGFuZGxlcnNBZGRlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5fcG9wdXAgPSBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRvcGVuUG9wdXA6IGZ1bmN0aW9uIChsYXllciwgbGF0bG5nKSB7XG5cdFx0aWYgKCEobGF5ZXIgaW5zdGFuY2VvZiBMLkxheWVyKSkge1xuXHRcdFx0bGF0bG5nID0gbGF5ZXI7XG5cdFx0XHRsYXllciA9IHRoaXM7XG5cdFx0fVxuXG5cdFx0aWYgKGxheWVyIGluc3RhbmNlb2YgTC5GZWF0dXJlR3JvdXApIHtcblx0XHRcdGZvciAodmFyIGlkIGluIHRoaXMuX2xheWVycykge1xuXHRcdFx0XHRsYXllciA9IHRoaXMuX2xheWVyc1tpZF07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICghbGF0bG5nKSB7XG5cdFx0XHRsYXRsbmcgPSBsYXllci5nZXRDZW50ZXIgPyBsYXllci5nZXRDZW50ZXIoKSA6IGxheWVyLmdldExhdExuZygpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9wb3B1cCAmJiB0aGlzLl9tYXApIHtcblx0XHRcdC8vIHNldCB0aGUgcG9wdXAgb2Zmc2V0IGZvciB0aGlzIGxheWVyXG5cdFx0XHR0aGlzLl9wb3B1cC5vcHRpb25zLm9mZnNldCA9IHRoaXMuX3BvcHVwQW5jaG9yKGxheWVyKTtcblxuXHRcdFx0Ly8gc2V0IHBvcHVwIHNvdXJjZSB0byB0aGlzIGxheWVyXG5cdFx0XHR0aGlzLl9wb3B1cC5fc291cmNlID0gbGF5ZXI7XG5cblx0XHRcdC8vIHVwZGF0ZSB0aGUgcG9wdXAgKGNvbnRlbnQsIGxheW91dCwgZWN0Li4uKVxuXHRcdFx0dGhpcy5fcG9wdXAudXBkYXRlKCk7XG5cblx0XHRcdC8vIG9wZW4gdGhlIHBvcHVwIG9uIHRoZSBtYXBcblx0XHRcdHRoaXMuX21hcC5vcGVuUG9wdXAodGhpcy5fcG9wdXAsIGxhdGxuZyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Y2xvc2VQb3B1cDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9wb3B1cCkge1xuXHRcdFx0dGhpcy5fcG9wdXAuX2Nsb3NlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHRvZ2dsZVBvcHVwOiBmdW5jdGlvbiAodGFyZ2V0KSB7XG5cdFx0aWYgKHRoaXMuX3BvcHVwKSB7XG5cdFx0XHRpZiAodGhpcy5fcG9wdXAuX21hcCkge1xuXHRcdFx0XHR0aGlzLmNsb3NlUG9wdXAoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMub3BlblBvcHVwKHRhcmdldCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGlzUG9wdXBPcGVuOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3BvcHVwLmlzT3BlbigpO1xuXHR9LFxuXG5cdHNldFBvcHVwQ29udGVudDogZnVuY3Rpb24gKGNvbnRlbnQpIHtcblx0XHRpZiAodGhpcy5fcG9wdXApIHtcblx0XHRcdHRoaXMuX3BvcHVwLnNldENvbnRlbnQoY29udGVudCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGdldFBvcHVwOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3BvcHVwO1xuXHR9LFxuXG5cdF9vcGVuUG9wdXA6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIGxheWVyID0gZS5sYXllciB8fCBlLnRhcmdldDtcblxuXHRcdGlmICghdGhpcy5fcG9wdXApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuX21hcCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIGlmIHRoaXMgaW5oZXJpdHMgZnJvbSBQYXRoIGl0cyBhIHZlY3RvciBhbmQgd2UgY2FuIGp1c3Rcblx0XHQvLyBvcGVuIHRoZSBwb3B1cCBhdCB0aGUgbmV3IGxvY2F0aW9uXG5cdFx0aWYgKGxheWVyIGluc3RhbmNlb2YgTC5QYXRoKSB7XG5cdFx0XHR0aGlzLm9wZW5Qb3B1cChlLmxheWVyIHx8IGUudGFyZ2V0LCBlLmxhdGxuZyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gb3RoZXJ3aXNlIHRyZWF0IGl0IGxpa2UgYSBtYXJrZXIgYW5kIGZpZ3VyZSBvdXRcblx0XHQvLyBpZiB3ZSBzaG91bGQgdG9nZ2xlIGl0IG9wZW4vY2xvc2VkXG5cdFx0aWYgKHRoaXMuX21hcC5oYXNMYXllcih0aGlzLl9wb3B1cCkgJiYgdGhpcy5fcG9wdXAuX3NvdXJjZSA9PT0gbGF5ZXIpIHtcblx0XHRcdHRoaXMuY2xvc2VQb3B1cCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLm9wZW5Qb3B1cChsYXllciwgZS5sYXRsbmcpO1xuXHRcdH1cblx0fSxcblxuXHRfcG9wdXBBbmNob3I6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdC8vIHdoZXJlIHNob2xkIHdlIGFuY2hvciB0aGUgcG9wdXAgb24gdGhpcyBsYXllcj9cblx0XHR2YXIgYW5jaG9yID0gbGF5ZXIuX2dldFBvcHVwQW5jaG9yID8gbGF5ZXIuX2dldFBvcHVwQW5jaG9yKCkgOiBbMCwgMF07XG5cblx0XHQvLyBhZGQgdGhlIHVzZXJzIHBhc3NlZCBvZmZzZXQgdG8gdGhhdFxuXHRcdHZhciBvZmZzZXRUb0FkZCA9IHRoaXMuX29yaWdpbmFsUG9wdXBPZmZzZXQgfHwgTC5Qb3B1cC5wcm90b3R5cGUub3B0aW9ucy5vZmZzZXQ7XG5cblx0XHQvLyByZXR1cm4gdGhlIGZpbmFsIHBvaW50IHRvIGFuY2hvciB0aGUgcG9wdXBcblx0XHRyZXR1cm4gTC5wb2ludChhbmNob3IpLmFkZChvZmZzZXRUb0FkZCk7XG5cdH0sXG5cblx0X21vdmVQb3B1cDogZnVuY3Rpb24gKGUpIHtcblx0XHR0aGlzLl9wb3B1cC5zZXRMYXRMbmcoZS5sYXRsbmcpO1xuXHR9XG59KTtcblxuXG5cbi8qXHJcbiAqIFBvcHVwIGV4dGVuc2lvbiB0byBMLk1hcmtlciwgYWRkaW5nIHBvcHVwLXJlbGF0ZWQgbWV0aG9kcy5cclxuICovXHJcblxyXG5MLk1hcmtlci5pbmNsdWRlKHtcclxuXHRfZ2V0UG9wdXBBbmNob3I6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMuaWNvbi5vcHRpb25zLnBvcHVwQW5jaG9yIHx8IFswLCAwXTtcclxuXHR9XHJcbn0pO1xyXG5cblxuXG4vKlxyXG4gKiBMLkxheWVyR3JvdXAgaXMgYSBjbGFzcyB0byBjb21iaW5lIHNldmVyYWwgbGF5ZXJzIGludG8gb25lIHNvIHRoYXRcclxuICogeW91IGNhbiBtYW5pcHVsYXRlIHRoZSBncm91cCAoZS5nLiBhZGQvcmVtb3ZlIGl0KSBhcyBvbmUgbGF5ZXIuXHJcbiAqL1xyXG5cclxuTC5MYXllckdyb3VwID0gTC5MYXllci5leHRlbmQoe1xyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAobGF5ZXJzKSB7XHJcblx0XHR0aGlzLl9sYXllcnMgPSB7fTtcclxuXHJcblx0XHR2YXIgaSwgbGVuO1xyXG5cclxuXHRcdGlmIChsYXllcnMpIHtcclxuXHRcdFx0Zm9yIChpID0gMCwgbGVuID0gbGF5ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5hZGRMYXllcihsYXllcnNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0YWRkTGF5ZXI6IGZ1bmN0aW9uIChsYXllcikge1xyXG5cdFx0dmFyIGlkID0gdGhpcy5nZXRMYXllcklkKGxheWVyKTtcclxuXHJcblx0XHR0aGlzLl9sYXllcnNbaWRdID0gbGF5ZXI7XHJcblxyXG5cdFx0aWYgKHRoaXMuX21hcCkge1xyXG5cdFx0XHR0aGlzLl9tYXAuYWRkTGF5ZXIobGF5ZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZUxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdHZhciBpZCA9IGxheWVyIGluIHRoaXMuX2xheWVycyA/IGxheWVyIDogdGhpcy5nZXRMYXllcklkKGxheWVyKTtcclxuXHJcblx0XHRpZiAodGhpcy5fbWFwICYmIHRoaXMuX2xheWVyc1tpZF0pIHtcclxuXHRcdFx0dGhpcy5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX2xheWVyc1tpZF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGRlbGV0ZSB0aGlzLl9sYXllcnNbaWRdO1xyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGhhc0xheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdHJldHVybiAhIWxheWVyICYmIChsYXllciBpbiB0aGlzLl9sYXllcnMgfHwgdGhpcy5nZXRMYXllcklkKGxheWVyKSBpbiB0aGlzLl9sYXllcnMpO1xyXG5cdH0sXHJcblxyXG5cdGNsZWFyTGF5ZXJzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2xheWVycykge1xyXG5cdFx0XHR0aGlzLnJlbW92ZUxheWVyKHRoaXMuX2xheWVyc1tpXSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRpbnZva2U6IGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XHJcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXHJcblx0XHQgICAgaSwgbGF5ZXI7XHJcblxyXG5cdFx0Zm9yIChpIGluIHRoaXMuX2xheWVycykge1xyXG5cdFx0XHRsYXllciA9IHRoaXMuX2xheWVyc1tpXTtcclxuXHJcblx0XHRcdGlmIChsYXllclttZXRob2ROYW1lXSkge1xyXG5cdFx0XHRcdGxheWVyW21ldGhvZE5hbWVdLmFwcGx5KGxheWVyLCBhcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XHJcblx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2xheWVycykge1xyXG5cdFx0XHRtYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXJzW2ldKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRvblJlbW92ZTogZnVuY3Rpb24gKG1hcCkge1xyXG5cdFx0Zm9yICh2YXIgaSBpbiB0aGlzLl9sYXllcnMpIHtcclxuXHRcdFx0bWFwLnJlbW92ZUxheWVyKHRoaXMuX2xheWVyc1tpXSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0ZWFjaExheWVyOiBmdW5jdGlvbiAobWV0aG9kLCBjb250ZXh0KSB7XHJcblx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2xheWVycykge1xyXG5cdFx0XHRtZXRob2QuY2FsbChjb250ZXh0LCB0aGlzLl9sYXllcnNbaV0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0Z2V0TGF5ZXI6IGZ1bmN0aW9uIChpZCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2xheWVyc1tpZF07XHJcblx0fSxcclxuXHJcblx0Z2V0TGF5ZXJzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgbGF5ZXJzID0gW107XHJcblxyXG5cdFx0Zm9yICh2YXIgaSBpbiB0aGlzLl9sYXllcnMpIHtcclxuXHRcdFx0bGF5ZXJzLnB1c2godGhpcy5fbGF5ZXJzW2ldKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBsYXllcnM7XHJcblx0fSxcclxuXHJcblx0c2V0WkluZGV4OiBmdW5jdGlvbiAoekluZGV4KSB7XHJcblx0XHRyZXR1cm4gdGhpcy5pbnZva2UoJ3NldFpJbmRleCcsIHpJbmRleCk7XHJcblx0fSxcclxuXHJcblx0Z2V0TGF5ZXJJZDogZnVuY3Rpb24gKGxheWVyKSB7XHJcblx0XHRyZXR1cm4gTC5zdGFtcChsYXllcik7XHJcblx0fVxyXG59KTtcclxuXHJcbkwubGF5ZXJHcm91cCA9IGZ1bmN0aW9uIChsYXllcnMpIHtcclxuXHRyZXR1cm4gbmV3IEwuTGF5ZXJHcm91cChsYXllcnMpO1xyXG59O1xyXG5cblxuXG4vKlxyXG4gKiBMLkZlYXR1cmVHcm91cCBleHRlbmRzIEwuTGF5ZXJHcm91cCBieSBpbnRyb2R1Y2luZyBtb3VzZSBldmVudHMgYW5kIGFkZGl0aW9uYWwgbWV0aG9kc1xyXG4gKiBzaGFyZWQgYmV0d2VlbiBhIGdyb3VwIG9mIGludGVyYWN0aXZlIGxheWVycyAobGlrZSB2ZWN0b3JzIG9yIG1hcmtlcnMpLlxyXG4gKi9cclxuXHJcbkwuRmVhdHVyZUdyb3VwID0gTC5MYXllckdyb3VwLmV4dGVuZCh7XHJcblxyXG5cdGFkZExheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdGlmICh0aGlzLmhhc0xheWVyKGxheWVyKSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHRsYXllci5hZGRFdmVudFBhcmVudCh0aGlzKTtcclxuXHJcblx0XHRMLkxheWVyR3JvdXAucHJvdG90eXBlLmFkZExheWVyLmNhbGwodGhpcywgbGF5ZXIpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLmZpcmUoJ2xheWVyYWRkJywge2xheWVyOiBsYXllcn0pO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZUxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdGlmICghdGhpcy5oYXNMYXllcihsYXllcikpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRpZiAobGF5ZXIgaW4gdGhpcy5fbGF5ZXJzKSB7XHJcblx0XHRcdGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyXTtcclxuXHRcdH1cclxuXHJcblx0XHRsYXllci5yZW1vdmVFdmVudFBhcmVudCh0aGlzKTtcclxuXHJcblx0XHRMLkxheWVyR3JvdXAucHJvdG90eXBlLnJlbW92ZUxheWVyLmNhbGwodGhpcywgbGF5ZXIpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLmZpcmUoJ2xheWVycmVtb3ZlJywge2xheWVyOiBsYXllcn0pO1xyXG5cdH0sXHJcblxyXG5cdHNldFN0eWxlOiBmdW5jdGlvbiAoc3R5bGUpIHtcclxuXHRcdHJldHVybiB0aGlzLmludm9rZSgnc2V0U3R5bGUnLCBzdHlsZSk7XHJcblx0fSxcclxuXHJcblx0YnJpbmdUb0Zyb250OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5pbnZva2UoJ2JyaW5nVG9Gcm9udCcpO1xyXG5cdH0sXHJcblxyXG5cdGJyaW5nVG9CYWNrOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5pbnZva2UoJ2JyaW5nVG9CYWNrJyk7XHJcblx0fSxcclxuXHJcblx0Z2V0Qm91bmRzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgYm91bmRzID0gbmV3IEwuTGF0TG5nQm91bmRzKCk7XHJcblxyXG5cdFx0Zm9yICh2YXIgaWQgaW4gdGhpcy5fbGF5ZXJzKSB7XHJcblx0XHRcdHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tpZF07XHJcblx0XHRcdGJvdW5kcy5leHRlbmQobGF5ZXIuZ2V0Qm91bmRzID8gbGF5ZXIuZ2V0Qm91bmRzKCkgOiBsYXllci5nZXRMYXRMbmcoKSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gYm91bmRzO1xyXG5cdH1cclxufSk7XHJcblxyXG5MLmZlYXR1cmVHcm91cCA9IGZ1bmN0aW9uIChsYXllcnMpIHtcclxuXHRyZXR1cm4gbmV3IEwuRmVhdHVyZUdyb3VwKGxheWVycyk7XHJcbn07XHJcblxuXG5cbi8qXG4gKiBMLlJlbmRlcmVyIGlzIGEgYmFzZSBjbGFzcyBmb3IgcmVuZGVyZXIgaW1wbGVtZW50YXRpb25zIChTVkcsIENhbnZhcyk7XG4gKiBoYW5kbGVzIHJlbmRlcmVyIGNvbnRhaW5lciwgYm91bmRzIGFuZCB6b29tIGFuaW1hdGlvbi5cbiAqL1xuXG5MLlJlbmRlcmVyID0gTC5MYXllci5leHRlbmQoe1xuXG5cdG9wdGlvbnM6IHtcblx0XHQvLyBob3cgbXVjaCB0byBleHRlbmQgdGhlIGNsaXAgYXJlYSBhcm91bmQgdGhlIG1hcCB2aWV3IChyZWxhdGl2ZSB0byBpdHMgc2l6ZSlcblx0XHQvLyBlLmcuIDAuMSB3b3VsZCBiZSAxMCUgb2YgbWFwIHZpZXcgaW4gZWFjaCBkaXJlY3Rpb247IGRlZmF1bHRzIHRvIGNsaXAgd2l0aCB0aGUgbWFwIHZpZXdcblx0XHRwYWRkaW5nOiAwLjFcblx0fSxcblxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHRMLnN0YW1wKHRoaXMpO1xuXHR9LFxuXG5cdG9uQWRkOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9jb250YWluZXIpIHtcblx0XHRcdHRoaXMuX2luaXRDb250YWluZXIoKTsgLy8gZGVmaW5lZCBieSByZW5kZXJlciBpbXBsZW1lbnRhdGlvbnNcblxuXHRcdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xuXHRcdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC16b29tLWFuaW1hdGVkJyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRQYW5lKCkuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKTtcblx0XHR0aGlzLl91cGRhdGUoKTtcblx0fSxcblxuXHRvblJlbW92ZTogZnVuY3Rpb24gKCkge1xuXHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fY29udGFpbmVyKTtcblx0fSxcblxuXHRnZXRFdmVudHM6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZXZlbnRzID0ge1xuXHRcdFx0dmlld3Jlc2V0OiB0aGlzLl9yZXNldCxcblx0XHRcdHpvb21zdGFydDogdGhpcy5fb25ab29tU3RhcnQsXG5cdFx0XHR6b29tOiB0aGlzLl9vblpvb20sXG5cdFx0XHRtb3ZlZW5kOiB0aGlzLl91cGRhdGVcblx0XHR9O1xuXHRcdGlmICh0aGlzLl96b29tQW5pbWF0ZWQpIHtcblx0XHRcdGV2ZW50cy56b29tYW5pbSA9IHRoaXMuX29uQW5pbVpvb207XG5cdFx0fVxuXHRcdHJldHVybiBldmVudHM7XG5cdH0sXG5cblx0X29uQW5pbVpvb206IGZ1bmN0aW9uIChldikge1xuXHRcdHRoaXMuX3VwZGF0ZVRyYW5zZm9ybShldi5jZW50ZXIsIGV2Lnpvb20pO1xuXHR9LFxuXG5cdF9vblpvb206IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl91cGRhdGVUcmFuc2Zvcm0odGhpcy5fbWFwLmdldENlbnRlcigpLCB0aGlzLl9tYXAuZ2V0Wm9vbSgpKTtcblx0fSxcblxuXHRfb25ab29tU3RhcnQ6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBEcmFnLXRoZW4tcGluY2ggaW50ZXJhY3Rpb25zIG1pZ2h0IG1lc3MgdXAgdGhlIGNlbnRlciBhbmQgem9vbS5cblx0XHQvLyBJbiB0aGlzIGNhc2UsIHRoZSBlYXNpZXN0IHdheSB0byBwcmV2ZW50IHRoaXMgaXMgcmUtZG8gdGhlIHJlbmRlcmVyXG5cdFx0Ly8gICBib3VuZHMgYW5kIHBhZGRpbmcgd2hlbiB0aGUgem9vbWluZyBzdGFydHMuXG5cdFx0dGhpcy5fdXBkYXRlKCk7XG5cdH0sXG5cblx0X3VwZGF0ZVRyYW5zZm9ybTogZnVuY3Rpb24gKGNlbnRlciwgem9vbSkge1xuXHRcdHZhciBzY2FsZSA9IHRoaXMuX21hcC5nZXRab29tU2NhbGUoem9vbSwgdGhpcy5fem9vbSksXG5cdFx0ICAgIHBvc2l0aW9uID0gTC5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2NvbnRhaW5lciksXG5cdFx0ICAgIHZpZXdIYWxmID0gdGhpcy5fbWFwLmdldFNpemUoKS5tdWx0aXBseUJ5KDAuNSArIHRoaXMub3B0aW9ucy5wYWRkaW5nKSxcblx0XHQgICAgY3VycmVudENlbnRlclBvaW50ID0gdGhpcy5fbWFwLnByb2plY3QodGhpcy5fY2VudGVyLCB6b29tKSxcblx0XHQgICAgZGVzdENlbnRlclBvaW50ID0gdGhpcy5fbWFwLnByb2plY3QoY2VudGVyLCB6b29tKSxcblx0XHQgICAgY2VudGVyT2Zmc2V0ID0gZGVzdENlbnRlclBvaW50LnN1YnRyYWN0KGN1cnJlbnRDZW50ZXJQb2ludCksXG5cblx0XHQgICAgdG9wTGVmdE9mZnNldCA9IHZpZXdIYWxmLm11bHRpcGx5QnkoLXNjYWxlKS5hZGQocG9zaXRpb24pLmFkZCh2aWV3SGFsZikuc3VidHJhY3QoY2VudGVyT2Zmc2V0KTtcblxuXHRcdEwuRG9tVXRpbC5zZXRUcmFuc2Zvcm0odGhpcy5fY29udGFpbmVyLCB0b3BMZWZ0T2Zmc2V0LCBzY2FsZSk7XG5cdH0sXG5cblx0X3Jlc2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fdXBkYXRlKCk7XG5cdFx0dGhpcy5fdXBkYXRlVHJhbnNmb3JtKHRoaXMuX2NlbnRlciwgdGhpcy5fem9vbSk7XG5cdH0sXG5cblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdC8vIHVwZGF0ZSBwaXhlbCBib3VuZHMgb2YgcmVuZGVyZXIgY29udGFpbmVyIChmb3IgcG9zaXRpb25pbmcvc2l6aW5nL2NsaXBwaW5nIGxhdGVyKVxuXHRcdHZhciBwID0gdGhpcy5vcHRpb25zLnBhZGRpbmcsXG5cdFx0ICAgIHNpemUgPSB0aGlzLl9tYXAuZ2V0U2l6ZSgpLFxuXHRcdCAgICBtaW4gPSB0aGlzLl9tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoc2l6ZS5tdWx0aXBseUJ5KC1wKSkucm91bmQoKTtcblxuXHRcdHRoaXMuX2JvdW5kcyA9IG5ldyBMLkJvdW5kcyhtaW4sIG1pbi5hZGQoc2l6ZS5tdWx0aXBseUJ5KDEgKyBwICogMikpLnJvdW5kKCkpO1xuXG5cdFx0dGhpcy5fY2VudGVyID0gdGhpcy5fbWFwLmdldENlbnRlcigpO1xuXHRcdHRoaXMuX3pvb20gPSB0aGlzLl9tYXAuZ2V0Wm9vbSgpO1xuXHR9XG59KTtcblxuXG5MLk1hcC5pbmNsdWRlKHtcblx0Ly8gdXNlZCBieSBlYWNoIHZlY3RvciBsYXllciB0byBkZWNpZGUgd2hpY2ggcmVuZGVyZXIgdG8gdXNlXG5cdGdldFJlbmRlcmVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHR2YXIgcmVuZGVyZXIgPSBsYXllci5vcHRpb25zLnJlbmRlcmVyIHx8IHRoaXMuX2dldFBhbmVSZW5kZXJlcihsYXllci5vcHRpb25zLnBhbmUpIHx8IHRoaXMub3B0aW9ucy5yZW5kZXJlciB8fCB0aGlzLl9yZW5kZXJlcjtcblxuXHRcdGlmICghcmVuZGVyZXIpIHtcblx0XHRcdHJlbmRlcmVyID0gdGhpcy5fcmVuZGVyZXIgPSAodGhpcy5vcHRpb25zLnByZWZlckNhbnZhcyAmJiBMLmNhbnZhcygpKSB8fCBMLnN2ZygpO1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5oYXNMYXllcihyZW5kZXJlcikpIHtcblx0XHRcdHRoaXMuYWRkTGF5ZXIocmVuZGVyZXIpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVuZGVyZXI7XG5cdH0sXG5cblx0X2dldFBhbmVSZW5kZXJlcjogZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRpZiAobmFtZSA9PT0gJ292ZXJsYXlQYW5lJyB8fCBuYW1lID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgcmVuZGVyZXIgPSB0aGlzLl9wYW5lUmVuZGVyZXJzW25hbWVdO1xuXHRcdGlmIChyZW5kZXJlciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZW5kZXJlciA9IChMLlNWRyAmJiBMLnN2Zyh7cGFuZTogbmFtZX0pKSB8fCAoTC5DYW52YXMgJiYgTC5jYW52YXMoe3BhbmU6IG5hbWV9KSk7XG5cdFx0XHR0aGlzLl9wYW5lUmVuZGVyZXJzW25hbWVdID0gcmVuZGVyZXI7XG5cdFx0fVxuXHRcdHJldHVybiByZW5kZXJlcjtcblx0fVxufSk7XG5cblxuXG4vKlxuICogTC5QYXRoIGlzIHRoZSBiYXNlIGNsYXNzIGZvciBhbGwgTGVhZmxldCB2ZWN0b3IgbGF5ZXJzIGxpa2UgcG9seWdvbnMgYW5kIGNpcmNsZXMuXG4gKi9cblxuTC5QYXRoID0gTC5MYXllci5leHRlbmQoe1xuXG5cdG9wdGlvbnM6IHtcblx0XHRzdHJva2U6IHRydWUsXG5cdFx0Y29sb3I6ICcjMzM4OGZmJyxcblx0XHR3ZWlnaHQ6IDMsXG5cdFx0b3BhY2l0eTogMSxcblx0XHRsaW5lQ2FwOiAncm91bmQnLFxuXHRcdGxpbmVKb2luOiAncm91bmQnLFxuXHRcdC8vIGRhc2hBcnJheTogbnVsbFxuXHRcdC8vIGRhc2hPZmZzZXQ6IG51bGxcblxuXHRcdC8vIGZpbGw6IGZhbHNlXG5cdFx0Ly8gZmlsbENvbG9yOiBzYW1lIGFzIGNvbG9yIGJ5IGRlZmF1bHRcblx0XHRmaWxsT3BhY2l0eTogMC4yLFxuXHRcdGZpbGxSdWxlOiAnZXZlbm9kZCcsXG5cblx0XHQvLyBjbGFzc05hbWU6ICcnXG5cdFx0aW50ZXJhY3RpdmU6IHRydWVcblx0fSxcblxuXHRiZWZvcmVBZGQ6IGZ1bmN0aW9uIChtYXApIHtcblx0XHQvLyBSZW5kZXJlciBpcyBzZXQgaGVyZSBiZWNhdXNlIHdlIG5lZWQgdG8gY2FsbCByZW5kZXJlci5nZXRFdmVudHNcblx0XHQvLyBiZWZvcmUgdGhpcy5nZXRFdmVudHMuXG5cdFx0dGhpcy5fcmVuZGVyZXIgPSBtYXAuZ2V0UmVuZGVyZXIodGhpcyk7XG5cdH0sXG5cblx0b25BZGQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9yZW5kZXJlci5faW5pdFBhdGgodGhpcyk7XG5cdFx0dGhpcy5fcmVzZXQoKTtcblx0XHR0aGlzLl9yZW5kZXJlci5fYWRkUGF0aCh0aGlzKTtcblx0fSxcblxuXHRvblJlbW92ZTogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX3JlbmRlcmVyLl9yZW1vdmVQYXRoKHRoaXMpO1xuXHR9LFxuXG5cdGdldEV2ZW50czogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR6b29tZW5kOiB0aGlzLl9wcm9qZWN0LFxuXHRcdFx0bW92ZWVuZDogdGhpcy5fdXBkYXRlLFxuXHRcdFx0dmlld3Jlc2V0OiB0aGlzLl9yZXNldFxuXHRcdH07XG5cdH0sXG5cblx0cmVkcmF3OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX21hcCkge1xuXHRcdFx0dGhpcy5fcmVuZGVyZXIuX3VwZGF0ZVBhdGgodGhpcyk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHNldFN0eWxlOiBmdW5jdGlvbiAoc3R5bGUpIHtcblx0XHRMLnNldE9wdGlvbnModGhpcywgc3R5bGUpO1xuXHRcdGlmICh0aGlzLl9yZW5kZXJlcikge1xuXHRcdFx0dGhpcy5fcmVuZGVyZXIuX3VwZGF0ZVN0eWxlKHRoaXMpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRicmluZ1RvRnJvbnQ6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fcmVuZGVyZXIpIHtcblx0XHRcdHRoaXMuX3JlbmRlcmVyLl9icmluZ1RvRnJvbnQodGhpcyk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGJyaW5nVG9CYWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX3JlbmRlcmVyKSB7XG5cdFx0XHR0aGlzLl9yZW5kZXJlci5fYnJpbmdUb0JhY2sodGhpcyk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGdldEVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fcGF0aDtcblx0fSxcblxuXHRfcmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBkZWZpbmVkIGluIGNoaWxkcmVuIGNsYXNzZXNcblx0XHR0aGlzLl9wcm9qZWN0KCk7XG5cdFx0dGhpcy5fdXBkYXRlKCk7XG5cdH0sXG5cblx0X2NsaWNrVG9sZXJhbmNlOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gdXNlZCB3aGVuIGRvaW5nIGhpdCBkZXRlY3Rpb24gZm9yIENhbnZhcyBsYXllcnNcblx0XHRyZXR1cm4gKHRoaXMub3B0aW9ucy5zdHJva2UgPyB0aGlzLm9wdGlvbnMud2VpZ2h0IC8gMiA6IDApICsgKEwuQnJvd3Nlci50b3VjaCA/IDEwIDogMCk7XG5cdH1cbn0pO1xuXG5cblxuLypcclxuICogTC5MaW5lVXRpbCBjb250YWlucyBkaWZmZXJlbnQgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIGxpbmUgc2VnbWVudHNcclxuICogYW5kIHBvbHlsaW5lcyAoY2xpcHBpbmcsIHNpbXBsaWZpY2F0aW9uLCBkaXN0YW5jZXMsIGV0Yy4pXHJcbiAqL1xyXG5cclxuTC5MaW5lVXRpbCA9IHtcclxuXHJcblx0Ly8gU2ltcGxpZnkgcG9seWxpbmUgd2l0aCB2ZXJ0ZXggcmVkdWN0aW9uIGFuZCBEb3VnbGFzLVBldWNrZXIgc2ltcGxpZmljYXRpb24uXHJcblx0Ly8gSW1wcm92ZXMgcmVuZGVyaW5nIHBlcmZvcm1hbmNlIGRyYW1hdGljYWxseSBieSBsZXNzZW5pbmcgdGhlIG51bWJlciBvZiBwb2ludHMgdG8gZHJhdy5cclxuXHJcblx0c2ltcGxpZnk6IGZ1bmN0aW9uIChwb2ludHMsIHRvbGVyYW5jZSkge1xyXG5cdFx0aWYgKCF0b2xlcmFuY2UgfHwgIXBvaW50cy5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuIHBvaW50cy5zbGljZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBzcVRvbGVyYW5jZSA9IHRvbGVyYW5jZSAqIHRvbGVyYW5jZTtcclxuXHJcblx0XHQvLyBzdGFnZSAxOiB2ZXJ0ZXggcmVkdWN0aW9uXHJcblx0XHRwb2ludHMgPSB0aGlzLl9yZWR1Y2VQb2ludHMocG9pbnRzLCBzcVRvbGVyYW5jZSk7XHJcblxyXG5cdFx0Ly8gc3RhZ2UgMjogRG91Z2xhcy1QZXVja2VyIHNpbXBsaWZpY2F0aW9uXHJcblx0XHRwb2ludHMgPSB0aGlzLl9zaW1wbGlmeURQKHBvaW50cywgc3FUb2xlcmFuY2UpO1xyXG5cclxuXHRcdHJldHVybiBwb2ludHM7XHJcblx0fSxcclxuXHJcblx0Ly8gZGlzdGFuY2UgZnJvbSBhIHBvaW50IHRvIGEgc2VnbWVudCBiZXR3ZWVuIHR3byBwb2ludHNcclxuXHRwb2ludFRvU2VnbWVudERpc3RhbmNlOiAgZnVuY3Rpb24gKHAsIHAxLCBwMikge1xyXG5cdFx0cmV0dXJuIE1hdGguc3FydCh0aGlzLl9zcUNsb3Nlc3RQb2ludE9uU2VnbWVudChwLCBwMSwgcDIsIHRydWUpKTtcclxuXHR9LFxyXG5cclxuXHRjbG9zZXN0UG9pbnRPblNlZ21lbnQ6IGZ1bmN0aW9uIChwLCBwMSwgcDIpIHtcclxuXHRcdHJldHVybiB0aGlzLl9zcUNsb3Nlc3RQb2ludE9uU2VnbWVudChwLCBwMSwgcDIpO1xyXG5cdH0sXHJcblxyXG5cdC8vIERvdWdsYXMtUGV1Y2tlciBzaW1wbGlmaWNhdGlvbiwgc2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRG91Z2xhcy1QZXVja2VyX2FsZ29yaXRobVxyXG5cdF9zaW1wbGlmeURQOiBmdW5jdGlvbiAocG9pbnRzLCBzcVRvbGVyYW5jZSkge1xyXG5cclxuXHRcdHZhciBsZW4gPSBwb2ludHMubGVuZ3RoLFxyXG5cdFx0ICAgIEFycmF5Q29uc3RydWN0b3IgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gdW5kZWZpbmVkICsgJycgPyBVaW50OEFycmF5IDogQXJyYXksXHJcblx0XHQgICAgbWFya2VycyA9IG5ldyBBcnJheUNvbnN0cnVjdG9yKGxlbik7XHJcblxyXG5cdFx0bWFya2Vyc1swXSA9IG1hcmtlcnNbbGVuIC0gMV0gPSAxO1xyXG5cclxuXHRcdHRoaXMuX3NpbXBsaWZ5RFBTdGVwKHBvaW50cywgbWFya2Vycywgc3FUb2xlcmFuY2UsIDAsIGxlbiAtIDEpO1xyXG5cclxuXHRcdHZhciBpLFxyXG5cdFx0ICAgIG5ld1BvaW50cyA9IFtdO1xyXG5cclxuXHRcdGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRpZiAobWFya2Vyc1tpXSkge1xyXG5cdFx0XHRcdG5ld1BvaW50cy5wdXNoKHBvaW50c1tpXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbmV3UG9pbnRzO1xyXG5cdH0sXHJcblxyXG5cdF9zaW1wbGlmeURQU3RlcDogZnVuY3Rpb24gKHBvaW50cywgbWFya2Vycywgc3FUb2xlcmFuY2UsIGZpcnN0LCBsYXN0KSB7XHJcblxyXG5cdFx0dmFyIG1heFNxRGlzdCA9IDAsXHJcblx0XHQgICAgaW5kZXgsIGksIHNxRGlzdDtcclxuXHJcblx0XHRmb3IgKGkgPSBmaXJzdCArIDE7IGkgPD0gbGFzdCAtIDE7IGkrKykge1xyXG5cdFx0XHRzcURpc3QgPSB0aGlzLl9zcUNsb3Nlc3RQb2ludE9uU2VnbWVudChwb2ludHNbaV0sIHBvaW50c1tmaXJzdF0sIHBvaW50c1tsYXN0XSwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRpZiAoc3FEaXN0ID4gbWF4U3FEaXN0KSB7XHJcblx0XHRcdFx0aW5kZXggPSBpO1xyXG5cdFx0XHRcdG1heFNxRGlzdCA9IHNxRGlzdDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChtYXhTcURpc3QgPiBzcVRvbGVyYW5jZSkge1xyXG5cdFx0XHRtYXJrZXJzW2luZGV4XSA9IDE7XHJcblxyXG5cdFx0XHR0aGlzLl9zaW1wbGlmeURQU3RlcChwb2ludHMsIG1hcmtlcnMsIHNxVG9sZXJhbmNlLCBmaXJzdCwgaW5kZXgpO1xyXG5cdFx0XHR0aGlzLl9zaW1wbGlmeURQU3RlcChwb2ludHMsIG1hcmtlcnMsIHNxVG9sZXJhbmNlLCBpbmRleCwgbGFzdCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Ly8gcmVkdWNlIHBvaW50cyB0aGF0IGFyZSB0b28gY2xvc2UgdG8gZWFjaCBvdGhlciB0byBhIHNpbmdsZSBwb2ludFxyXG5cdF9yZWR1Y2VQb2ludHM6IGZ1bmN0aW9uIChwb2ludHMsIHNxVG9sZXJhbmNlKSB7XHJcblx0XHR2YXIgcmVkdWNlZFBvaW50cyA9IFtwb2ludHNbMF1dO1xyXG5cclxuXHRcdGZvciAodmFyIGkgPSAxLCBwcmV2ID0gMCwgbGVuID0gcG9pbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGlmICh0aGlzLl9zcURpc3QocG9pbnRzW2ldLCBwb2ludHNbcHJldl0pID4gc3FUb2xlcmFuY2UpIHtcclxuXHRcdFx0XHRyZWR1Y2VkUG9pbnRzLnB1c2gocG9pbnRzW2ldKTtcclxuXHRcdFx0XHRwcmV2ID0gaTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHByZXYgPCBsZW4gLSAxKSB7XHJcblx0XHRcdHJlZHVjZWRQb2ludHMucHVzaChwb2ludHNbbGVuIC0gMV0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlZHVjZWRQb2ludHM7XHJcblx0fSxcclxuXHJcblx0Ly8gQ29oZW4tU3V0aGVybGFuZCBsaW5lIGNsaXBwaW5nIGFsZ29yaXRobS5cclxuXHQvLyBVc2VkIHRvIGF2b2lkIHJlbmRlcmluZyBwYXJ0cyBvZiBhIHBvbHlsaW5lIHRoYXQgYXJlIG5vdCBjdXJyZW50bHkgdmlzaWJsZS5cclxuXHJcblx0Y2xpcFNlZ21lbnQ6IGZ1bmN0aW9uIChhLCBiLCBib3VuZHMsIHVzZUxhc3RDb2RlLCByb3VuZCkge1xyXG5cdFx0dmFyIGNvZGVBID0gdXNlTGFzdENvZGUgPyB0aGlzLl9sYXN0Q29kZSA6IHRoaXMuX2dldEJpdENvZGUoYSwgYm91bmRzKSxcclxuXHRcdCAgICBjb2RlQiA9IHRoaXMuX2dldEJpdENvZGUoYiwgYm91bmRzKSxcclxuXHJcblx0XHQgICAgY29kZU91dCwgcCwgbmV3Q29kZTtcclxuXHJcblx0XHQvLyBzYXZlIDJuZCBjb2RlIHRvIGF2b2lkIGNhbGN1bGF0aW5nIGl0IG9uIHRoZSBuZXh0IHNlZ21lbnRcclxuXHRcdHRoaXMuX2xhc3RDb2RlID0gY29kZUI7XHJcblxyXG5cdFx0d2hpbGUgKHRydWUpIHtcclxuXHRcdFx0Ly8gaWYgYSxiIGlzIGluc2lkZSB0aGUgY2xpcCB3aW5kb3cgKHRyaXZpYWwgYWNjZXB0KVxyXG5cdFx0XHRpZiAoIShjb2RlQSB8IGNvZGVCKSkgeyByZXR1cm4gW2EsIGJdOyB9XHJcblxyXG5cdFx0XHQvLyBpZiBhLGIgaXMgb3V0c2lkZSB0aGUgY2xpcCB3aW5kb3cgKHRyaXZpYWwgcmVqZWN0KVxyXG5cdFx0XHRpZiAoY29kZUEgJiBjb2RlQikgeyByZXR1cm4gZmFsc2U7IH1cclxuXHJcblx0XHRcdC8vIG90aGVyIGNhc2VzXHJcblx0XHRcdGNvZGVPdXQgPSBjb2RlQSB8fCBjb2RlQjtcclxuXHRcdFx0cCA9IHRoaXMuX2dldEVkZ2VJbnRlcnNlY3Rpb24oYSwgYiwgY29kZU91dCwgYm91bmRzLCByb3VuZCk7XHJcblx0XHRcdG5ld0NvZGUgPSB0aGlzLl9nZXRCaXRDb2RlKHAsIGJvdW5kcyk7XHJcblxyXG5cdFx0XHRpZiAoY29kZU91dCA9PT0gY29kZUEpIHtcclxuXHRcdFx0XHRhID0gcDtcclxuXHRcdFx0XHRjb2RlQSA9IG5ld0NvZGU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0YiA9IHA7XHJcblx0XHRcdFx0Y29kZUIgPSBuZXdDb2RlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X2dldEVkZ2VJbnRlcnNlY3Rpb246IGZ1bmN0aW9uIChhLCBiLCBjb2RlLCBib3VuZHMsIHJvdW5kKSB7XHJcblx0XHR2YXIgZHggPSBiLnggLSBhLngsXHJcblx0XHQgICAgZHkgPSBiLnkgLSBhLnksXHJcblx0XHQgICAgbWluID0gYm91bmRzLm1pbixcclxuXHRcdCAgICBtYXggPSBib3VuZHMubWF4LFxyXG5cdFx0ICAgIHgsIHk7XHJcblxyXG5cdFx0aWYgKGNvZGUgJiA4KSB7IC8vIHRvcFxyXG5cdFx0XHR4ID0gYS54ICsgZHggKiAobWF4LnkgLSBhLnkpIC8gZHk7XHJcblx0XHRcdHkgPSBtYXgueTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKGNvZGUgJiA0KSB7IC8vIGJvdHRvbVxyXG5cdFx0XHR4ID0gYS54ICsgZHggKiAobWluLnkgLSBhLnkpIC8gZHk7XHJcblx0XHRcdHkgPSBtaW4ueTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKGNvZGUgJiAyKSB7IC8vIHJpZ2h0XHJcblx0XHRcdHggPSBtYXgueDtcclxuXHRcdFx0eSA9IGEueSArIGR5ICogKG1heC54IC0gYS54KSAvIGR4O1xyXG5cclxuXHRcdH0gZWxzZSBpZiAoY29kZSAmIDEpIHsgLy8gbGVmdFxyXG5cdFx0XHR4ID0gbWluLng7XHJcblx0XHRcdHkgPSBhLnkgKyBkeSAqIChtaW4ueCAtIGEueCkgLyBkeDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbmV3IEwuUG9pbnQoeCwgeSwgcm91bmQpO1xyXG5cdH0sXHJcblxyXG5cdF9nZXRCaXRDb2RlOiBmdW5jdGlvbiAocCwgYm91bmRzKSB7XHJcblx0XHR2YXIgY29kZSA9IDA7XHJcblxyXG5cdFx0aWYgKHAueCA8IGJvdW5kcy5taW4ueCkgeyAvLyBsZWZ0XHJcblx0XHRcdGNvZGUgfD0gMTtcclxuXHRcdH0gZWxzZSBpZiAocC54ID4gYm91bmRzLm1heC54KSB7IC8vIHJpZ2h0XHJcblx0XHRcdGNvZGUgfD0gMjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAocC55IDwgYm91bmRzLm1pbi55KSB7IC8vIGJvdHRvbVxyXG5cdFx0XHRjb2RlIHw9IDQ7XHJcblx0XHR9IGVsc2UgaWYgKHAueSA+IGJvdW5kcy5tYXgueSkgeyAvLyB0b3BcclxuXHRcdFx0Y29kZSB8PSA4O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjb2RlO1xyXG5cdH0sXHJcblxyXG5cdC8vIHNxdWFyZSBkaXN0YW5jZSAodG8gYXZvaWQgdW5uZWNlc3NhcnkgTWF0aC5zcXJ0IGNhbGxzKVxyXG5cdF9zcURpc3Q6IGZ1bmN0aW9uIChwMSwgcDIpIHtcclxuXHRcdHZhciBkeCA9IHAyLnggLSBwMS54LFxyXG5cdFx0ICAgIGR5ID0gcDIueSAtIHAxLnk7XHJcblx0XHRyZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XHJcblx0fSxcclxuXHJcblx0Ly8gcmV0dXJuIGNsb3Nlc3QgcG9pbnQgb24gc2VnbWVudCBvciBkaXN0YW5jZSB0byB0aGF0IHBvaW50XHJcblx0X3NxQ2xvc2VzdFBvaW50T25TZWdtZW50OiBmdW5jdGlvbiAocCwgcDEsIHAyLCBzcURpc3QpIHtcclxuXHRcdHZhciB4ID0gcDEueCxcclxuXHRcdCAgICB5ID0gcDEueSxcclxuXHRcdCAgICBkeCA9IHAyLnggLSB4LFxyXG5cdFx0ICAgIGR5ID0gcDIueSAtIHksXHJcblx0XHQgICAgZG90ID0gZHggKiBkeCArIGR5ICogZHksXHJcblx0XHQgICAgdDtcclxuXHJcblx0XHRpZiAoZG90ID4gMCkge1xyXG5cdFx0XHR0ID0gKChwLnggLSB4KSAqIGR4ICsgKHAueSAtIHkpICogZHkpIC8gZG90O1xyXG5cclxuXHRcdFx0aWYgKHQgPiAxKSB7XHJcblx0XHRcdFx0eCA9IHAyLng7XHJcblx0XHRcdFx0eSA9IHAyLnk7XHJcblx0XHRcdH0gZWxzZSBpZiAodCA+IDApIHtcclxuXHRcdFx0XHR4ICs9IGR4ICogdDtcclxuXHRcdFx0XHR5ICs9IGR5ICogdDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGR4ID0gcC54IC0geDtcclxuXHRcdGR5ID0gcC55IC0geTtcclxuXHJcblx0XHRyZXR1cm4gc3FEaXN0ID8gZHggKiBkeCArIGR5ICogZHkgOiBuZXcgTC5Qb2ludCh4LCB5KTtcclxuXHR9XHJcbn07XHJcblxuXG5cbi8qXG4gKiBMLlBvbHlsaW5lIGltcGxlbWVudHMgcG9seWxpbmUgdmVjdG9yIGxheWVyIChhIHNldCBvZiBwb2ludHMgY29ubmVjdGVkIHdpdGggbGluZXMpXG4gKi9cblxuTC5Qb2x5bGluZSA9IEwuUGF0aC5leHRlbmQoe1xuXG5cdG9wdGlvbnM6IHtcblx0XHQvLyBob3cgbXVjaCB0byBzaW1wbGlmeSB0aGUgcG9seWxpbmUgb24gZWFjaCB6b29tIGxldmVsXG5cdFx0Ly8gbW9yZSA9IGJldHRlciBwZXJmb3JtYW5jZSBhbmQgc21vb3RoZXIgbG9vaywgbGVzcyA9IG1vcmUgYWNjdXJhdGVcblx0XHRzbW9vdGhGYWN0b3I6IDEuMFxuXHRcdC8vIG5vQ2xpcDogZmFsc2Vcblx0fSxcblxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAobGF0bG5ncywgb3B0aW9ucykge1xuXHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHR0aGlzLl9zZXRMYXRMbmdzKGxhdGxuZ3MpO1xuXHR9LFxuXG5cdGdldExhdExuZ3M6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbGF0bG5ncztcblx0fSxcblxuXHRzZXRMYXRMbmdzOiBmdW5jdGlvbiAobGF0bG5ncykge1xuXHRcdHRoaXMuX3NldExhdExuZ3MobGF0bG5ncyk7XG5cdFx0cmV0dXJuIHRoaXMucmVkcmF3KCk7XG5cdH0sXG5cblx0aXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAhdGhpcy5fbGF0bG5ncy5sZW5ndGg7XG5cdH0sXG5cblx0Y2xvc2VzdExheWVyUG9pbnQ6IGZ1bmN0aW9uIChwKSB7XG5cdFx0dmFyIG1pbkRpc3RhbmNlID0gSW5maW5pdHksXG5cdFx0ICAgIG1pblBvaW50ID0gbnVsbCxcblx0XHQgICAgY2xvc2VzdCA9IEwuTGluZVV0aWwuX3NxQ2xvc2VzdFBvaW50T25TZWdtZW50LFxuXHRcdCAgICBwMSwgcDI7XG5cblx0XHRmb3IgKHZhciBqID0gMCwgakxlbiA9IHRoaXMuX3BhcnRzLmxlbmd0aDsgaiA8IGpMZW47IGorKykge1xuXHRcdFx0dmFyIHBvaW50cyA9IHRoaXMuX3BhcnRzW2pdO1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMSwgbGVuID0gcG9pbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRcdHAxID0gcG9pbnRzW2kgLSAxXTtcblx0XHRcdFx0cDIgPSBwb2ludHNbaV07XG5cblx0XHRcdFx0dmFyIHNxRGlzdCA9IGNsb3Nlc3QocCwgcDEsIHAyLCB0cnVlKTtcblxuXHRcdFx0XHRpZiAoc3FEaXN0IDwgbWluRGlzdGFuY2UpIHtcblx0XHRcdFx0XHRtaW5EaXN0YW5jZSA9IHNxRGlzdDtcblx0XHRcdFx0XHRtaW5Qb2ludCA9IGNsb3Nlc3QocCwgcDEsIHAyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAobWluUG9pbnQpIHtcblx0XHRcdG1pblBvaW50LmRpc3RhbmNlID0gTWF0aC5zcXJ0KG1pbkRpc3RhbmNlKTtcblx0XHR9XG5cdFx0cmV0dXJuIG1pblBvaW50O1xuXHR9LFxuXG5cdGdldENlbnRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBpLCBoYWxmRGlzdCwgc2VnRGlzdCwgZGlzdCwgcDEsIHAyLCByYXRpbyxcblx0XHQgICAgcG9pbnRzID0gdGhpcy5fcmluZ3NbMF0sXG5cdFx0ICAgIGxlbiA9IHBvaW50cy5sZW5ndGg7XG5cblx0XHRpZiAoIWxlbikgeyByZXR1cm4gbnVsbDsgfVxuXG5cdFx0Ly8gcG9seWxpbmUgY2VudHJvaWQgYWxnb3JpdGhtOyBvbmx5IHVzZXMgdGhlIGZpcnN0IHJpbmcgaWYgdGhlcmUgYXJlIG11bHRpcGxlXG5cblx0XHRmb3IgKGkgPSAwLCBoYWxmRGlzdCA9IDA7IGkgPCBsZW4gLSAxOyBpKyspIHtcblx0XHRcdGhhbGZEaXN0ICs9IHBvaW50c1tpXS5kaXN0YW5jZVRvKHBvaW50c1tpICsgMV0pIC8gMjtcblx0XHR9XG5cblx0XHQvLyBUaGUgbGluZSBpcyBzbyBzbWFsbCBpbiB0aGUgY3VycmVudCB2aWV3IHRoYXQgYWxsIHBvaW50cyBhcmUgb24gdGhlIHNhbWUgcGl4ZWwuXG5cdFx0aWYgKGhhbGZEaXN0ID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWFwLmxheWVyUG9pbnRUb0xhdExuZyhwb2ludHNbMF0pO1xuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGRpc3QgPSAwOyBpIDwgbGVuIC0gMTsgaSsrKSB7XG5cdFx0XHRwMSA9IHBvaW50c1tpXTtcblx0XHRcdHAyID0gcG9pbnRzW2kgKyAxXTtcblx0XHRcdHNlZ0Rpc3QgPSBwMS5kaXN0YW5jZVRvKHAyKTtcblx0XHRcdGRpc3QgKz0gc2VnRGlzdDtcblxuXHRcdFx0aWYgKGRpc3QgPiBoYWxmRGlzdCkge1xuXHRcdFx0XHRyYXRpbyA9IChkaXN0IC0gaGFsZkRpc3QpIC8gc2VnRGlzdDtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX21hcC5sYXllclBvaW50VG9MYXRMbmcoW1xuXHRcdFx0XHRcdHAyLnggLSByYXRpbyAqIChwMi54IC0gcDEueCksXG5cdFx0XHRcdFx0cDIueSAtIHJhdGlvICogKHAyLnkgLSBwMS55KVxuXHRcdFx0XHRdKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Z2V0Qm91bmRzOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JvdW5kcztcblx0fSxcblxuXHRhZGRMYXRMbmc6IGZ1bmN0aW9uIChsYXRsbmcsIGxhdGxuZ3MpIHtcblx0XHRsYXRsbmdzID0gbGF0bG5ncyB8fCB0aGlzLl9kZWZhdWx0U2hhcGUoKTtcblx0XHRsYXRsbmcgPSBMLmxhdExuZyhsYXRsbmcpO1xuXHRcdGxhdGxuZ3MucHVzaChsYXRsbmcpO1xuXHRcdHRoaXMuX2JvdW5kcy5leHRlbmQobGF0bG5nKTtcblx0XHRyZXR1cm4gdGhpcy5yZWRyYXcoKTtcblx0fSxcblxuXHRfc2V0TGF0TG5nczogZnVuY3Rpb24gKGxhdGxuZ3MpIHtcblx0XHR0aGlzLl9ib3VuZHMgPSBuZXcgTC5MYXRMbmdCb3VuZHMoKTtcblx0XHR0aGlzLl9sYXRsbmdzID0gdGhpcy5fY29udmVydExhdExuZ3MobGF0bG5ncyk7XG5cdH0sXG5cblx0X2RlZmF1bHRTaGFwZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBMLlBvbHlsaW5lLl9mbGF0KHRoaXMuX2xhdGxuZ3MpID8gdGhpcy5fbGF0bG5ncyA6IHRoaXMuX2xhdGxuZ3NbMF07XG5cdH0sXG5cblx0Ly8gcmVjdXJzaXZlbHkgY29udmVydCBsYXRsbmdzIGlucHV0IGludG8gYWN0dWFsIExhdExuZyBpbnN0YW5jZXM7IGNhbGN1bGF0ZSBib3VuZHMgYWxvbmcgdGhlIHdheVxuXHRfY29udmVydExhdExuZ3M6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG5cdFx0dmFyIHJlc3VsdCA9IFtdLFxuXHRcdCAgICBmbGF0ID0gTC5Qb2x5bGluZS5fZmxhdChsYXRsbmdzKTtcblxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsYXRsbmdzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRpZiAoZmxhdCkge1xuXHRcdFx0XHRyZXN1bHRbaV0gPSBMLmxhdExuZyhsYXRsbmdzW2ldKTtcblx0XHRcdFx0dGhpcy5fYm91bmRzLmV4dGVuZChyZXN1bHRbaV0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzdWx0W2ldID0gdGhpcy5fY29udmVydExhdExuZ3MobGF0bG5nc1tpXSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHRfcHJvamVjdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX3JpbmdzID0gW107XG5cdFx0dGhpcy5fcHJvamVjdExhdGxuZ3ModGhpcy5fbGF0bG5ncywgdGhpcy5fcmluZ3MpO1xuXG5cdFx0Ly8gcHJvamVjdCBib3VuZHMgYXMgd2VsbCB0byB1c2UgbGF0ZXIgZm9yIENhbnZhcyBoaXQgZGV0ZWN0aW9uL2V0Yy5cblx0XHR2YXIgdyA9IHRoaXMuX2NsaWNrVG9sZXJhbmNlKCksXG5cdFx0ICAgIHAgPSBuZXcgTC5Qb2ludCh3LCAtdyk7XG5cblx0XHRpZiAodGhpcy5fYm91bmRzLmlzVmFsaWQoKSkge1xuXHRcdFx0dGhpcy5fcHhCb3VuZHMgPSBuZXcgTC5Cb3VuZHMoXG5cdFx0XHRcdHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fYm91bmRzLmdldFNvdXRoV2VzdCgpKS5fc3VidHJhY3QocCksXG5cdFx0XHRcdHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fYm91bmRzLmdldE5vcnRoRWFzdCgpKS5fYWRkKHApKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gcmVjdXJzaXZlbHkgdHVybnMgbGF0bG5ncyBpbnRvIGEgc2V0IG9mIHJpbmdzIHdpdGggcHJvamVjdGVkIGNvb3JkaW5hdGVzXG5cdF9wcm9qZWN0TGF0bG5nczogZnVuY3Rpb24gKGxhdGxuZ3MsIHJlc3VsdCkge1xuXG5cdFx0dmFyIGZsYXQgPSBsYXRsbmdzWzBdIGluc3RhbmNlb2YgTC5MYXRMbmcsXG5cdFx0ICAgIGxlbiA9IGxhdGxuZ3MubGVuZ3RoLFxuXHRcdCAgICBpLCByaW5nO1xuXG5cdFx0aWYgKGZsYXQpIHtcblx0XHRcdHJpbmcgPSBbXTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRyaW5nW2ldID0gdGhpcy5fbWFwLmxhdExuZ1RvTGF5ZXJQb2ludChsYXRsbmdzW2ldKTtcblx0XHRcdH1cblx0XHRcdHJlc3VsdC5wdXNoKHJpbmcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0dGhpcy5fcHJvamVjdExhdGxuZ3MobGF0bG5nc1tpXSwgcmVzdWx0KTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Ly8gY2xpcCBwb2x5bGluZSBieSByZW5kZXJlciBib3VuZHMgc28gdGhhdCB3ZSBoYXZlIGxlc3MgdG8gcmVuZGVyIGZvciBwZXJmb3JtYW5jZVxuXHRfY2xpcFBvaW50czogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBib3VuZHMgPSB0aGlzLl9yZW5kZXJlci5fYm91bmRzO1xuXG5cdFx0dGhpcy5fcGFydHMgPSBbXTtcblx0XHRpZiAoIXRoaXMuX3B4Qm91bmRzIHx8ICF0aGlzLl9weEJvdW5kcy5pbnRlcnNlY3RzKGJvdW5kcykpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLm5vQ2xpcCkge1xuXHRcdFx0dGhpcy5fcGFydHMgPSB0aGlzLl9yaW5ncztcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgcGFydHMgPSB0aGlzLl9wYXJ0cyxcblx0XHQgICAgaSwgaiwgaywgbGVuLCBsZW4yLCBzZWdtZW50LCBwb2ludHM7XG5cblx0XHRmb3IgKGkgPSAwLCBrID0gMCwgbGVuID0gdGhpcy5fcmluZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHBvaW50cyA9IHRoaXMuX3JpbmdzW2ldO1xuXG5cdFx0XHRmb3IgKGogPSAwLCBsZW4yID0gcG9pbnRzLmxlbmd0aDsgaiA8IGxlbjIgLSAxOyBqKyspIHtcblx0XHRcdFx0c2VnbWVudCA9IEwuTGluZVV0aWwuY2xpcFNlZ21lbnQocG9pbnRzW2pdLCBwb2ludHNbaiArIDFdLCBib3VuZHMsIGosIHRydWUpO1xuXG5cdFx0XHRcdGlmICghc2VnbWVudCkgeyBjb250aW51ZTsgfVxuXG5cdFx0XHRcdHBhcnRzW2tdID0gcGFydHNba10gfHwgW107XG5cdFx0XHRcdHBhcnRzW2tdLnB1c2goc2VnbWVudFswXSk7XG5cblx0XHRcdFx0Ly8gaWYgc2VnbWVudCBnb2VzIG91dCBvZiBzY3JlZW4sIG9yIGl0J3MgdGhlIGxhc3Qgb25lLCBpdCdzIHRoZSBlbmQgb2YgdGhlIGxpbmUgcGFydFxuXHRcdFx0XHRpZiAoKHNlZ21lbnRbMV0gIT09IHBvaW50c1tqICsgMV0pIHx8IChqID09PSBsZW4yIC0gMikpIHtcblx0XHRcdFx0XHRwYXJ0c1trXS5wdXNoKHNlZ21lbnRbMV0pO1xuXHRcdFx0XHRcdGsrKztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyBzaW1wbGlmeSBlYWNoIGNsaXBwZWQgcGFydCBvZiB0aGUgcG9seWxpbmUgZm9yIHBlcmZvcm1hbmNlXG5cdF9zaW1wbGlmeVBvaW50czogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBwYXJ0cyA9IHRoaXMuX3BhcnRzLFxuXHRcdCAgICB0b2xlcmFuY2UgPSB0aGlzLm9wdGlvbnMuc21vb3RoRmFjdG9yO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRwYXJ0c1tpXSA9IEwuTGluZVV0aWwuc2ltcGxpZnkocGFydHNbaV0sIHRvbGVyYW5jZSk7XG5cdFx0fVxuXHR9LFxuXG5cdF91cGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX21hcCkgeyByZXR1cm47IH1cblxuXHRcdHRoaXMuX2NsaXBQb2ludHMoKTtcblx0XHR0aGlzLl9zaW1wbGlmeVBvaW50cygpO1xuXHRcdHRoaXMuX3VwZGF0ZVBhdGgoKTtcblx0fSxcblxuXHRfdXBkYXRlUGF0aDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX3JlbmRlcmVyLl91cGRhdGVQb2x5KHRoaXMpO1xuXHR9XG59KTtcblxuTC5wb2x5bGluZSA9IGZ1bmN0aW9uIChsYXRsbmdzLCBvcHRpb25zKSB7XG5cdHJldHVybiBuZXcgTC5Qb2x5bGluZShsYXRsbmdzLCBvcHRpb25zKTtcbn07XG5cbkwuUG9seWxpbmUuX2ZsYXQgPSBmdW5jdGlvbiAobGF0bG5ncykge1xuXHQvLyB0cnVlIGlmIGl0J3MgYSBmbGF0IGFycmF5IG9mIGxhdGxuZ3M7IGZhbHNlIGlmIG5lc3RlZFxuXHRyZXR1cm4gIUwuVXRpbC5pc0FycmF5KGxhdGxuZ3NbMF0pIHx8ICh0eXBlb2YgbGF0bG5nc1swXVswXSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIGxhdGxuZ3NbMF1bMF0gIT09ICd1bmRlZmluZWQnKTtcbn07XG5cblxuXG4vKlxyXG4gKiBMLlBvbHlVdGlsIGNvbnRhaW5zIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBwb2x5Z29ucyAoY2xpcHBpbmcsIGV0Yy4pLlxyXG4gKi9cclxuXHJcbkwuUG9seVV0aWwgPSB7fTtcclxuXHJcbi8qXHJcbiAqIFN1dGhlcmxhbmQtSG9kZ2VtYW4gcG9seWdvbiBjbGlwcGluZyBhbGdvcml0aG0uXHJcbiAqIFVzZWQgdG8gYXZvaWQgcmVuZGVyaW5nIHBhcnRzIG9mIGEgcG9seWdvbiB0aGF0IGFyZSBub3QgY3VycmVudGx5IHZpc2libGUuXHJcbiAqL1xyXG5MLlBvbHlVdGlsLmNsaXBQb2x5Z29uID0gZnVuY3Rpb24gKHBvaW50cywgYm91bmRzLCByb3VuZCkge1xyXG5cdHZhciBjbGlwcGVkUG9pbnRzLFxyXG5cdCAgICBlZGdlcyA9IFsxLCA0LCAyLCA4XSxcclxuXHQgICAgaSwgaiwgayxcclxuXHQgICAgYSwgYixcclxuXHQgICAgbGVuLCBlZGdlLCBwLFxyXG5cdCAgICBsdSA9IEwuTGluZVV0aWw7XHJcblxyXG5cdGZvciAoaSA9IDAsIGxlbiA9IHBvaW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0cG9pbnRzW2ldLl9jb2RlID0gbHUuX2dldEJpdENvZGUocG9pbnRzW2ldLCBib3VuZHMpO1xyXG5cdH1cclxuXHJcblx0Ly8gZm9yIGVhY2ggZWRnZSAobGVmdCwgYm90dG9tLCByaWdodCwgdG9wKVxyXG5cdGZvciAoayA9IDA7IGsgPCA0OyBrKyspIHtcclxuXHRcdGVkZ2UgPSBlZGdlc1trXTtcclxuXHRcdGNsaXBwZWRQb2ludHMgPSBbXTtcclxuXHJcblx0XHRmb3IgKGkgPSAwLCBsZW4gPSBwb2ludHMubGVuZ3RoLCBqID0gbGVuIC0gMTsgaSA8IGxlbjsgaiA9IGkrKykge1xyXG5cdFx0XHRhID0gcG9pbnRzW2ldO1xyXG5cdFx0XHRiID0gcG9pbnRzW2pdO1xyXG5cclxuXHRcdFx0Ly8gaWYgYSBpcyBpbnNpZGUgdGhlIGNsaXAgd2luZG93XHJcblx0XHRcdGlmICghKGEuX2NvZGUgJiBlZGdlKSkge1xyXG5cdFx0XHRcdC8vIGlmIGIgaXMgb3V0c2lkZSB0aGUgY2xpcCB3aW5kb3cgKGEtPmIgZ29lcyBvdXQgb2Ygc2NyZWVuKVxyXG5cdFx0XHRcdGlmIChiLl9jb2RlICYgZWRnZSkge1xyXG5cdFx0XHRcdFx0cCA9IGx1Ll9nZXRFZGdlSW50ZXJzZWN0aW9uKGIsIGEsIGVkZ2UsIGJvdW5kcywgcm91bmQpO1xyXG5cdFx0XHRcdFx0cC5fY29kZSA9IGx1Ll9nZXRCaXRDb2RlKHAsIGJvdW5kcyk7XHJcblx0XHRcdFx0XHRjbGlwcGVkUG9pbnRzLnB1c2gocCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNsaXBwZWRQb2ludHMucHVzaChhKTtcclxuXHJcblx0XHRcdC8vIGVsc2UgaWYgYiBpcyBpbnNpZGUgdGhlIGNsaXAgd2luZG93IChhLT5iIGVudGVycyB0aGUgc2NyZWVuKVxyXG5cdFx0XHR9IGVsc2UgaWYgKCEoYi5fY29kZSAmIGVkZ2UpKSB7XHJcblx0XHRcdFx0cCA9IGx1Ll9nZXRFZGdlSW50ZXJzZWN0aW9uKGIsIGEsIGVkZ2UsIGJvdW5kcywgcm91bmQpO1xyXG5cdFx0XHRcdHAuX2NvZGUgPSBsdS5fZ2V0Qml0Q29kZShwLCBib3VuZHMpO1xyXG5cdFx0XHRcdGNsaXBwZWRQb2ludHMucHVzaChwKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cG9pbnRzID0gY2xpcHBlZFBvaW50cztcclxuXHR9XHJcblxyXG5cdHJldHVybiBwb2ludHM7XHJcbn07XHJcblxuXG5cbi8qXG4gKiBMLlBvbHlnb24gaW1wbGVtZW50cyBwb2x5Z29uIHZlY3RvciBsYXllciAoY2xvc2VkIHBvbHlsaW5lIHdpdGggYSBmaWxsIGluc2lkZSkuXG4gKi9cblxuTC5Qb2x5Z29uID0gTC5Qb2x5bGluZS5leHRlbmQoe1xuXG5cdG9wdGlvbnM6IHtcblx0XHRmaWxsOiB0cnVlXG5cdH0sXG5cblx0aXNFbXB0eTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAhdGhpcy5fbGF0bG5ncy5sZW5ndGggfHwgIXRoaXMuX2xhdGxuZ3NbMF0ubGVuZ3RoO1xuXHR9LFxuXG5cdGdldENlbnRlcjogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBpLCBqLCBwMSwgcDIsIGYsIGFyZWEsIHgsIHksIGNlbnRlcixcblx0XHQgICAgcG9pbnRzID0gdGhpcy5fcmluZ3NbMF0sXG5cdFx0ICAgIGxlbiA9IHBvaW50cy5sZW5ndGg7XG5cblx0XHRpZiAoIWxlbikgeyByZXR1cm4gbnVsbDsgfVxuXG5cdFx0Ly8gcG9seWdvbiBjZW50cm9pZCBhbGdvcml0aG07IG9ubHkgdXNlcyB0aGUgZmlyc3QgcmluZyBpZiB0aGVyZSBhcmUgbXVsdGlwbGVcblxuXHRcdGFyZWEgPSB4ID0geSA9IDA7XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gbGVuIC0gMTsgaSA8IGxlbjsgaiA9IGkrKykge1xuXHRcdFx0cDEgPSBwb2ludHNbaV07XG5cdFx0XHRwMiA9IHBvaW50c1tqXTtcblxuXHRcdFx0ZiA9IHAxLnkgKiBwMi54IC0gcDIueSAqIHAxLng7XG5cdFx0XHR4ICs9IChwMS54ICsgcDIueCkgKiBmO1xuXHRcdFx0eSArPSAocDEueSArIHAyLnkpICogZjtcblx0XHRcdGFyZWEgKz0gZiAqIDM7XG5cdFx0fVxuXG5cdFx0aWYgKGFyZWEgPT09IDApIHtcblx0XHRcdC8vIFBvbHlnb24gaXMgc28gc21hbGwgdGhhdCBhbGwgcG9pbnRzIGFyZSBvbiBzYW1lIHBpeGVsLlxuXHRcdFx0Y2VudGVyID0gcG9pbnRzWzBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjZW50ZXIgPSBbeCAvIGFyZWEsIHkgLyBhcmVhXTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX21hcC5sYXllclBvaW50VG9MYXRMbmcoY2VudGVyKTtcblx0fSxcblxuXHRfY29udmVydExhdExuZ3M6IGZ1bmN0aW9uIChsYXRsbmdzKSB7XG5cdFx0dmFyIHJlc3VsdCA9IEwuUG9seWxpbmUucHJvdG90eXBlLl9jb252ZXJ0TGF0TG5ncy5jYWxsKHRoaXMsIGxhdGxuZ3MpLFxuXHRcdCAgICBsZW4gPSByZXN1bHQubGVuZ3RoO1xuXG5cdFx0Ly8gcmVtb3ZlIGxhc3QgcG9pbnQgaWYgaXQgZXF1YWxzIGZpcnN0IG9uZVxuXHRcdGlmIChsZW4gPj0gMiAmJiByZXN1bHRbMF0gaW5zdGFuY2VvZiBMLkxhdExuZyAmJiByZXN1bHRbMF0uZXF1YWxzKHJlc3VsdFtsZW4gLSAxXSkpIHtcblx0XHRcdHJlc3VsdC5wb3AoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHRfc2V0TGF0TG5nczogZnVuY3Rpb24gKGxhdGxuZ3MpIHtcblx0XHRMLlBvbHlsaW5lLnByb3RvdHlwZS5fc2V0TGF0TG5ncy5jYWxsKHRoaXMsIGxhdGxuZ3MpO1xuXHRcdGlmIChMLlBvbHlsaW5lLl9mbGF0KHRoaXMuX2xhdGxuZ3MpKSB7XG5cdFx0XHR0aGlzLl9sYXRsbmdzID0gW3RoaXMuX2xhdGxuZ3NdO1xuXHRcdH1cblx0fSxcblxuXHRfZGVmYXVsdFNoYXBlOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIEwuUG9seWxpbmUuX2ZsYXQodGhpcy5fbGF0bG5nc1swXSkgPyB0aGlzLl9sYXRsbmdzWzBdIDogdGhpcy5fbGF0bG5nc1swXVswXTtcblx0fSxcblxuXHRfY2xpcFBvaW50czogZnVuY3Rpb24gKCkge1xuXHRcdC8vIHBvbHlnb25zIG5lZWQgYSBkaWZmZXJlbnQgY2xpcHBpbmcgYWxnb3JpdGhtIHNvIHdlIHJlZGVmaW5lIHRoYXRcblxuXHRcdHZhciBib3VuZHMgPSB0aGlzLl9yZW5kZXJlci5fYm91bmRzLFxuXHRcdCAgICB3ID0gdGhpcy5vcHRpb25zLndlaWdodCxcblx0XHQgICAgcCA9IG5ldyBMLlBvaW50KHcsIHcpO1xuXG5cdFx0Ly8gaW5jcmVhc2UgY2xpcCBwYWRkaW5nIGJ5IHN0cm9rZSB3aWR0aCB0byBhdm9pZCBzdHJva2Ugb24gY2xpcCBlZGdlc1xuXHRcdGJvdW5kcyA9IG5ldyBMLkJvdW5kcyhib3VuZHMubWluLnN1YnRyYWN0KHApLCBib3VuZHMubWF4LmFkZChwKSk7XG5cblx0XHR0aGlzLl9wYXJ0cyA9IFtdO1xuXHRcdGlmICghdGhpcy5fcHhCb3VuZHMgfHwgIXRoaXMuX3B4Qm91bmRzLmludGVyc2VjdHMoYm91bmRzKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLm9wdGlvbnMubm9DbGlwKSB7XG5cdFx0XHR0aGlzLl9wYXJ0cyA9IHRoaXMuX3JpbmdzO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9yaW5ncy5sZW5ndGgsIGNsaXBwZWQ7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0Y2xpcHBlZCA9IEwuUG9seVV0aWwuY2xpcFBvbHlnb24odGhpcy5fcmluZ3NbaV0sIGJvdW5kcywgdHJ1ZSk7XG5cdFx0XHRpZiAoY2xpcHBlZC5sZW5ndGgpIHtcblx0XHRcdFx0dGhpcy5fcGFydHMucHVzaChjbGlwcGVkKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0X3VwZGF0ZVBhdGg6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9yZW5kZXJlci5fdXBkYXRlUG9seSh0aGlzLCB0cnVlKTtcblx0fVxufSk7XG5cbkwucG9seWdvbiA9IGZ1bmN0aW9uIChsYXRsbmdzLCBvcHRpb25zKSB7XG5cdHJldHVybiBuZXcgTC5Qb2x5Z29uKGxhdGxuZ3MsIG9wdGlvbnMpO1xufTtcblxuXG5cbi8qXG4gKiBMLlJlY3RhbmdsZSBleHRlbmRzIFBvbHlnb24gYW5kIGNyZWF0ZXMgYSByZWN0YW5nbGUgd2hlbiBwYXNzZWQgYSBMYXRMbmdCb3VuZHMgb2JqZWN0LlxuICovXG5cbkwuUmVjdGFuZ2xlID0gTC5Qb2x5Z29uLmV4dGVuZCh7XG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChsYXRMbmdCb3VuZHMsIG9wdGlvbnMpIHtcblx0XHRMLlBvbHlnb24ucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCB0aGlzLl9ib3VuZHNUb0xhdExuZ3MobGF0TG5nQm91bmRzKSwgb3B0aW9ucyk7XG5cdH0sXG5cblx0c2V0Qm91bmRzOiBmdW5jdGlvbiAobGF0TG5nQm91bmRzKSB7XG5cdFx0cmV0dXJuIHRoaXMuc2V0TGF0TG5ncyh0aGlzLl9ib3VuZHNUb0xhdExuZ3MobGF0TG5nQm91bmRzKSk7XG5cdH0sXG5cblx0X2JvdW5kc1RvTGF0TG5nczogZnVuY3Rpb24gKGxhdExuZ0JvdW5kcykge1xuXHRcdGxhdExuZ0JvdW5kcyA9IEwubGF0TG5nQm91bmRzKGxhdExuZ0JvdW5kcyk7XG5cdFx0cmV0dXJuIFtcblx0XHRcdGxhdExuZ0JvdW5kcy5nZXRTb3V0aFdlc3QoKSxcblx0XHRcdGxhdExuZ0JvdW5kcy5nZXROb3J0aFdlc3QoKSxcblx0XHRcdGxhdExuZ0JvdW5kcy5nZXROb3J0aEVhc3QoKSxcblx0XHRcdGxhdExuZ0JvdW5kcy5nZXRTb3V0aEVhc3QoKVxuXHRcdF07XG5cdH1cbn0pO1xuXG5MLnJlY3RhbmdsZSA9IGZ1bmN0aW9uIChsYXRMbmdCb3VuZHMsIG9wdGlvbnMpIHtcblx0cmV0dXJuIG5ldyBMLlJlY3RhbmdsZShsYXRMbmdCb3VuZHMsIG9wdGlvbnMpO1xufTtcblxuXG5cbi8qXG4gKiBMLkNpcmNsZU1hcmtlciBpcyBhIGNpcmNsZSBvdmVybGF5IHdpdGggYSBwZXJtYW5lbnQgcGl4ZWwgcmFkaXVzLlxuICovXG5cbkwuQ2lyY2xlTWFya2VyID0gTC5QYXRoLmV4dGVuZCh7XG5cblx0b3B0aW9uczoge1xuXHRcdGZpbGw6IHRydWUsXG5cdFx0cmFkaXVzOiAxMFxuXHR9LFxuXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChsYXRsbmcsIG9wdGlvbnMpIHtcblx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0dGhpcy5fbGF0bG5nID0gTC5sYXRMbmcobGF0bG5nKTtcblx0XHR0aGlzLl9yYWRpdXMgPSB0aGlzLm9wdGlvbnMucmFkaXVzO1xuXHR9LFxuXG5cdHNldExhdExuZzogZnVuY3Rpb24gKGxhdGxuZykge1xuXHRcdHRoaXMuX2xhdGxuZyA9IEwubGF0TG5nKGxhdGxuZyk7XG5cdFx0dGhpcy5yZWRyYXcoKTtcblx0XHRyZXR1cm4gdGhpcy5maXJlKCdtb3ZlJywge2xhdGxuZzogdGhpcy5fbGF0bG5nfSk7XG5cdH0sXG5cblx0Z2V0TGF0TG5nOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2xhdGxuZztcblx0fSxcblxuXHRzZXRSYWRpdXM6IGZ1bmN0aW9uIChyYWRpdXMpIHtcblx0XHR0aGlzLm9wdGlvbnMucmFkaXVzID0gdGhpcy5fcmFkaXVzID0gcmFkaXVzO1xuXHRcdHJldHVybiB0aGlzLnJlZHJhdygpO1xuXHR9LFxuXG5cdGdldFJhZGl1czogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9yYWRpdXM7XG5cdH0sXG5cblx0c2V0U3R5bGUgOiBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHZhciByYWRpdXMgPSBvcHRpb25zICYmIG9wdGlvbnMucmFkaXVzIHx8IHRoaXMuX3JhZGl1cztcblx0XHRMLlBhdGgucHJvdG90eXBlLnNldFN0eWxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdFx0dGhpcy5zZXRSYWRpdXMocmFkaXVzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfcHJvamVjdDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX3BvaW50ID0gdGhpcy5fbWFwLmxhdExuZ1RvTGF5ZXJQb2ludCh0aGlzLl9sYXRsbmcpO1xuXHRcdHRoaXMuX3VwZGF0ZUJvdW5kcygpO1xuXHR9LFxuXG5cdF91cGRhdGVCb3VuZHM6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgciA9IHRoaXMuX3JhZGl1cyxcblx0XHQgICAgcjIgPSB0aGlzLl9yYWRpdXNZIHx8IHIsXG5cdFx0ICAgIHcgPSB0aGlzLl9jbGlja1RvbGVyYW5jZSgpLFxuXHRcdCAgICBwID0gW3IgKyB3LCByMiArIHddO1xuXHRcdHRoaXMuX3B4Qm91bmRzID0gbmV3IEwuQm91bmRzKHRoaXMuX3BvaW50LnN1YnRyYWN0KHApLCB0aGlzLl9wb2ludC5hZGQocCkpO1xuXHR9LFxuXG5cdF91cGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fbWFwKSB7XG5cdFx0XHR0aGlzLl91cGRhdGVQYXRoKCk7XG5cdFx0fVxuXHR9LFxuXG5cdF91cGRhdGVQYXRoOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fcmVuZGVyZXIuX3VwZGF0ZUNpcmNsZSh0aGlzKTtcblx0fSxcblxuXHRfZW1wdHk6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fcmFkaXVzICYmICF0aGlzLl9yZW5kZXJlci5fYm91bmRzLmludGVyc2VjdHModGhpcy5fcHhCb3VuZHMpO1xuXHR9XG59KTtcblxuTC5jaXJjbGVNYXJrZXIgPSBmdW5jdGlvbiAobGF0bG5nLCBvcHRpb25zKSB7XG5cdHJldHVybiBuZXcgTC5DaXJjbGVNYXJrZXIobGF0bG5nLCBvcHRpb25zKTtcbn07XG5cblxuXG4vKlxuICogTC5DaXJjbGUgaXMgYSBjaXJjbGUgb3ZlcmxheSAod2l0aCBhIGNlcnRhaW4gcmFkaXVzIGluIG1ldGVycykuXG4gKiBJdCdzIGFuIGFwcHJveGltYXRpb24gYW5kIHN0YXJ0cyB0byBkaXZlcmdlIGZyb20gYSByZWFsIGNpcmNsZSBjbG9zZXIgdG8gcG9sZXMgKGR1ZSB0byBwcm9qZWN0aW9uIGRpc3RvcnRpb24pXG4gKi9cblxuTC5DaXJjbGUgPSBMLkNpcmNsZU1hcmtlci5leHRlbmQoe1xuXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChsYXRsbmcsIG9wdGlvbnMpIHtcblx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0dGhpcy5fbGF0bG5nID0gTC5sYXRMbmcobGF0bG5nKTtcblx0XHR0aGlzLl9tUmFkaXVzID0gdGhpcy5vcHRpb25zLnJhZGl1cztcblx0fSxcblxuXHRzZXRSYWRpdXM6IGZ1bmN0aW9uIChyYWRpdXMpIHtcblx0XHR0aGlzLl9tUmFkaXVzID0gcmFkaXVzO1xuXHRcdHJldHVybiB0aGlzLnJlZHJhdygpO1xuXHR9LFxuXG5cdGdldFJhZGl1czogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9tUmFkaXVzO1xuXHR9LFxuXG5cdGdldEJvdW5kczogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBoYWxmID0gW3RoaXMuX3JhZGl1cywgdGhpcy5fcmFkaXVzWSB8fCB0aGlzLl9yYWRpdXNdO1xuXG5cdFx0cmV0dXJuIG5ldyBMLkxhdExuZ0JvdW5kcyhcblx0XHRcdHRoaXMuX21hcC5sYXllclBvaW50VG9MYXRMbmcodGhpcy5fcG9pbnQuc3VidHJhY3QoaGFsZikpLFxuXHRcdFx0dGhpcy5fbWFwLmxheWVyUG9pbnRUb0xhdExuZyh0aGlzLl9wb2ludC5hZGQoaGFsZikpKTtcblx0fSxcblxuXHRzZXRTdHlsZTogTC5QYXRoLnByb3RvdHlwZS5zZXRTdHlsZSxcblxuXHRfcHJvamVjdDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIGxuZyA9IHRoaXMuX2xhdGxuZy5sbmcsXG5cdFx0ICAgIGxhdCA9IHRoaXMuX2xhdGxuZy5sYXQsXG5cdFx0ICAgIG1hcCA9IHRoaXMuX21hcCxcblx0XHQgICAgY3JzID0gbWFwLm9wdGlvbnMuY3JzO1xuXG5cdFx0aWYgKGNycy5kaXN0YW5jZSA9PT0gTC5DUlMuRWFydGguZGlzdGFuY2UpIHtcblx0XHRcdHZhciBkID0gTWF0aC5QSSAvIDE4MCxcblx0XHRcdCAgICBsYXRSID0gKHRoaXMuX21SYWRpdXMgLyBMLkNSUy5FYXJ0aC5SKSAvIGQsXG5cdFx0XHQgICAgdG9wID0gbWFwLnByb2plY3QoW2xhdCArIGxhdFIsIGxuZ10pLFxuXHRcdFx0ICAgIGJvdHRvbSA9IG1hcC5wcm9qZWN0KFtsYXQgLSBsYXRSLCBsbmddKSxcblx0XHRcdCAgICBwID0gdG9wLmFkZChib3R0b20pLmRpdmlkZUJ5KDIpLFxuXHRcdFx0ICAgIGxhdDIgPSBtYXAudW5wcm9qZWN0KHApLmxhdCxcblx0XHRcdCAgICBsbmdSID0gTWF0aC5hY29zKChNYXRoLmNvcyhsYXRSICogZCkgLSBNYXRoLnNpbihsYXQgKiBkKSAqIE1hdGguc2luKGxhdDIgKiBkKSkgL1xuXHRcdFx0ICAgICAgICAgICAgKE1hdGguY29zKGxhdCAqIGQpICogTWF0aC5jb3MobGF0MiAqIGQpKSkgLyBkO1xuXG5cdFx0XHR0aGlzLl9wb2ludCA9IHAuc3VidHJhY3QobWFwLmdldFBpeGVsT3JpZ2luKCkpO1xuXHRcdFx0dGhpcy5fcmFkaXVzID0gaXNOYU4obG5nUikgPyAwIDogTWF0aC5tYXgoTWF0aC5yb3VuZChwLnggLSBtYXAucHJvamVjdChbbGF0MiwgbG5nIC0gbG5nUl0pLngpLCAxKTtcblx0XHRcdHRoaXMuX3JhZGl1c1kgPSBNYXRoLm1heChNYXRoLnJvdW5kKHAueSAtIHRvcC55KSwgMSk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGxhdGxuZzIgPSBjcnMudW5wcm9qZWN0KGNycy5wcm9qZWN0KHRoaXMuX2xhdGxuZykuc3VidHJhY3QoW3RoaXMuX21SYWRpdXMsIDBdKSk7XG5cblx0XHRcdHRoaXMuX3BvaW50ID0gbWFwLmxhdExuZ1RvTGF5ZXJQb2ludCh0aGlzLl9sYXRsbmcpO1xuXHRcdFx0dGhpcy5fcmFkaXVzID0gdGhpcy5fcG9pbnQueCAtIG1hcC5sYXRMbmdUb0xheWVyUG9pbnQobGF0bG5nMikueDtcblx0XHR9XG5cblx0XHR0aGlzLl91cGRhdGVCb3VuZHMoKTtcblx0fVxufSk7XG5cbkwuY2lyY2xlID0gZnVuY3Rpb24gKGxhdGxuZywgb3B0aW9ucywgbGVnYWN5T3B0aW9ucykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdudW1iZXInKSB7XG5cdFx0Ly8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCAwLjcueCBmYWN0b3J5IChsYXRsbmcsIHJhZGl1cywgb3B0aW9ucz8pXG5cdFx0b3B0aW9ucyA9IEwuZXh0ZW5kKHt9LCBsZWdhY3lPcHRpb25zLCB7cmFkaXVzOiBvcHRpb25zfSk7XG5cdH1cblx0cmV0dXJuIG5ldyBMLkNpcmNsZShsYXRsbmcsIG9wdGlvbnMpO1xufTtcblxuXG5cbi8qXG4gKiBMLlNWRyByZW5kZXJzIHZlY3RvciBsYXllcnMgd2l0aCBTVkcuIEFsbCBTVkctc3BlY2lmaWMgY29kZSBnb2VzIGhlcmUuXG4gKi9cblxuTC5TVkcgPSBMLlJlbmRlcmVyLmV4dGVuZCh7XG5cblx0X2luaXRDb250YWluZXI6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9jb250YWluZXIgPSBMLlNWRy5jcmVhdGUoJ3N2ZycpO1xuXG5cdFx0Ly8gbWFrZXMgaXQgcG9zc2libGUgdG8gY2xpY2sgdGhyb3VnaCBzdmcgcm9vdDsgd2UnbGwgcmVzZXQgaXQgYmFjayBpbiBpbmRpdmlkdWFsIHBhdGhzXG5cdFx0dGhpcy5fY29udGFpbmVyLnNldEF0dHJpYnV0ZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpO1xuXG5cdFx0dGhpcy5fcm9vdEdyb3VwID0gTC5TVkcuY3JlYXRlKCdnJyk7XG5cdFx0dGhpcy5fY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuX3Jvb3RHcm91cCk7XG5cdH0sXG5cblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9tYXAuX2FuaW1hdGluZ1pvb20gJiYgdGhpcy5fYm91bmRzKSB7IHJldHVybjsgfVxuXG5cdFx0TC5SZW5kZXJlci5wcm90b3R5cGUuX3VwZGF0ZS5jYWxsKHRoaXMpO1xuXG5cdFx0dmFyIGIgPSB0aGlzLl9ib3VuZHMsXG5cdFx0ICAgIHNpemUgPSBiLmdldFNpemUoKSxcblx0XHQgICAgY29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuXG5cdFx0Ly8gc2V0IHNpemUgb2Ygc3ZnLWNvbnRhaW5lciBpZiBjaGFuZ2VkXG5cdFx0aWYgKCF0aGlzLl9zdmdTaXplIHx8ICF0aGlzLl9zdmdTaXplLmVxdWFscyhzaXplKSkge1xuXHRcdFx0dGhpcy5fc3ZnU2l6ZSA9IHNpemU7XG5cdFx0XHRjb250YWluZXIuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHNpemUueCk7XG5cdFx0XHRjb250YWluZXIuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBzaXplLnkpO1xuXHRcdH1cblxuXHRcdC8vIG1vdmVtZW50OiB1cGRhdGUgY29udGFpbmVyIHZpZXdCb3ggc28gdGhhdCB3ZSBkb24ndCBoYXZlIHRvIGNoYW5nZSBjb29yZGluYXRlcyBvZiBpbmRpdmlkdWFsIGxheWVyc1xuXHRcdEwuRG9tVXRpbC5zZXRQb3NpdGlvbihjb250YWluZXIsIGIubWluKTtcblx0XHRjb250YWluZXIuc2V0QXR0cmlidXRlKCd2aWV3Qm94JywgW2IubWluLngsIGIubWluLnksIHNpemUueCwgc2l6ZS55XS5qb2luKCcgJykpO1xuXHR9LFxuXG5cdC8vIG1ldGhvZHMgYmVsb3cgYXJlIGNhbGxlZCBieSB2ZWN0b3IgbGF5ZXJzIGltcGxlbWVudGF0aW9uc1xuXG5cdF9pbml0UGF0aDogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0dmFyIHBhdGggPSBsYXllci5fcGF0aCA9IEwuU1ZHLmNyZWF0ZSgncGF0aCcpO1xuXG5cdFx0aWYgKGxheWVyLm9wdGlvbnMuY2xhc3NOYW1lKSB7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MocGF0aCwgbGF5ZXIub3B0aW9ucy5jbGFzc05hbWUpO1xuXHRcdH1cblxuXHRcdGlmIChsYXllci5vcHRpb25zLmludGVyYWN0aXZlKSB7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MocGF0aCwgJ2xlYWZsZXQtaW50ZXJhY3RpdmUnKTtcblx0XHR9XG5cblx0XHR0aGlzLl91cGRhdGVTdHlsZShsYXllcik7XG5cdH0sXG5cblx0X2FkZFBhdGg6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHRoaXMuX3Jvb3RHcm91cC5hcHBlbmRDaGlsZChsYXllci5fcGF0aCk7XG5cdFx0bGF5ZXIuYWRkSW50ZXJhY3RpdmVUYXJnZXQobGF5ZXIuX3BhdGgpO1xuXHR9LFxuXG5cdF9yZW1vdmVQYXRoOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHRMLkRvbVV0aWwucmVtb3ZlKGxheWVyLl9wYXRoKTtcblx0XHRsYXllci5yZW1vdmVJbnRlcmFjdGl2ZVRhcmdldChsYXllci5fcGF0aCk7XG5cdH0sXG5cblx0X3VwZGF0ZVBhdGg6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdGxheWVyLl9wcm9qZWN0KCk7XG5cdFx0bGF5ZXIuX3VwZGF0ZSgpO1xuXHR9LFxuXG5cdF91cGRhdGVTdHlsZTogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0dmFyIHBhdGggPSBsYXllci5fcGF0aCxcblx0XHQgICAgb3B0aW9ucyA9IGxheWVyLm9wdGlvbnM7XG5cblx0XHRpZiAoIXBhdGgpIHsgcmV0dXJuOyB9XG5cblx0XHRpZiAob3B0aW9ucy5zdHJva2UpIHtcblx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UnLCBvcHRpb25zLmNvbG9yKTtcblx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2Utb3BhY2l0eScsIG9wdGlvbnMub3BhY2l0eSk7XG5cdFx0XHRwYXRoLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJywgb3B0aW9ucy53ZWlnaHQpO1xuXHRcdFx0cGF0aC5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS1saW5lY2FwJywgb3B0aW9ucy5saW5lQ2FwKTtcblx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UtbGluZWpvaW4nLCBvcHRpb25zLmxpbmVKb2luKTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZGFzaEFycmF5KSB7XG5cdFx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UtZGFzaGFycmF5Jywgb3B0aW9ucy5kYXNoQXJyYXkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0aC5yZW1vdmVBdHRyaWJ1dGUoJ3N0cm9rZS1kYXNoYXJyYXknKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9wdGlvbnMuZGFzaE9mZnNldCkge1xuXHRcdFx0XHRwYXRoLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLWRhc2hvZmZzZXQnLCBvcHRpb25zLmRhc2hPZmZzZXQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0aC5yZW1vdmVBdHRyaWJ1dGUoJ3N0cm9rZS1kYXNob2Zmc2V0Jyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UnLCAnbm9uZScpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLmZpbGwpIHtcblx0XHRcdHBhdGguc2V0QXR0cmlidXRlKCdmaWxsJywgb3B0aW9ucy5maWxsQ29sb3IgfHwgb3B0aW9ucy5jb2xvcik7XG5cdFx0XHRwYXRoLnNldEF0dHJpYnV0ZSgnZmlsbC1vcGFjaXR5Jywgb3B0aW9ucy5maWxsT3BhY2l0eSk7XG5cdFx0XHRwYXRoLnNldEF0dHJpYnV0ZSgnZmlsbC1ydWxlJywgb3B0aW9ucy5maWxsUnVsZSB8fCAnZXZlbm9kZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRoLnNldEF0dHJpYnV0ZSgnZmlsbCcsICdub25lJyk7XG5cdFx0fVxuXG5cdFx0cGF0aC5zZXRBdHRyaWJ1dGUoJ3BvaW50ZXItZXZlbnRzJywgb3B0aW9ucy5wb2ludGVyRXZlbnRzIHx8IChvcHRpb25zLmludGVyYWN0aXZlID8gJ3Zpc2libGVQYWludGVkJyA6ICdub25lJykpO1xuXHR9LFxuXG5cdF91cGRhdGVQb2x5OiBmdW5jdGlvbiAobGF5ZXIsIGNsb3NlZCkge1xuXHRcdHRoaXMuX3NldFBhdGgobGF5ZXIsIEwuU1ZHLnBvaW50c1RvUGF0aChsYXllci5fcGFydHMsIGNsb3NlZCkpO1xuXHR9LFxuXG5cdF91cGRhdGVDaXJjbGU6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHZhciBwID0gbGF5ZXIuX3BvaW50LFxuXHRcdCAgICByID0gbGF5ZXIuX3JhZGl1cyxcblx0XHQgICAgcjIgPSBsYXllci5fcmFkaXVzWSB8fCByLFxuXHRcdCAgICBhcmMgPSAnYScgKyByICsgJywnICsgcjIgKyAnIDAgMSwwICc7XG5cblx0XHQvLyBkcmF3aW5nIGEgY2lyY2xlIHdpdGggdHdvIGhhbGYtYXJjc1xuXHRcdHZhciBkID0gbGF5ZXIuX2VtcHR5KCkgPyAnTTAgMCcgOlxuXHRcdFx0XHQnTScgKyAocC54IC0gcikgKyAnLCcgKyBwLnkgK1xuXHRcdFx0XHRhcmMgKyAociAqIDIpICsgJywwICcgK1xuXHRcdFx0XHRhcmMgKyAoLXIgKiAyKSArICcsMCAnO1xuXG5cdFx0dGhpcy5fc2V0UGF0aChsYXllciwgZCk7XG5cdH0sXG5cblx0X3NldFBhdGg6IGZ1bmN0aW9uIChsYXllciwgcGF0aCkge1xuXHRcdGxheWVyLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGgpO1xuXHR9LFxuXG5cdC8vIFNWRyBkb2VzIG5vdCBoYXZlIHRoZSBjb25jZXB0IG9mIHpJbmRleCBzbyB3ZSByZXNvcnQgdG8gY2hhbmdpbmcgdGhlIERPTSBvcmRlciBvZiBlbGVtZW50c1xuXHRfYnJpbmdUb0Zyb250OiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHRMLkRvbVV0aWwudG9Gcm9udChsYXllci5fcGF0aCk7XG5cdH0sXG5cblx0X2JyaW5nVG9CYWNrOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHRMLkRvbVV0aWwudG9CYWNrKGxheWVyLl9wYXRoKTtcblx0fVxufSk7XG5cblxuTC5leHRlbmQoTC5TVkcsIHtcblx0Y3JlYXRlOiBmdW5jdGlvbiAobmFtZSkge1xuXHRcdHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbmFtZSk7XG5cdH0sXG5cblx0Ly8gZ2VuZXJhdGVzIFNWRyBwYXRoIHN0cmluZyBmb3IgbXVsdGlwbGUgcmluZ3MsIHdpdGggZWFjaCByaW5nIHR1cm5pbmcgaW50byBcIk0uLkwuLkwuLlwiIGluc3RydWN0aW9uc1xuXHRwb2ludHNUb1BhdGg6IGZ1bmN0aW9uIChyaW5ncywgY2xvc2VkKSB7XG5cdFx0dmFyIHN0ciA9ICcnLFxuXHRcdCAgICBpLCBqLCBsZW4sIGxlbjIsIHBvaW50cywgcDtcblxuXHRcdGZvciAoaSA9IDAsIGxlbiA9IHJpbmdzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRwb2ludHMgPSByaW5nc1tpXTtcblxuXHRcdFx0Zm9yIChqID0gMCwgbGVuMiA9IHBvaW50cy5sZW5ndGg7IGogPCBsZW4yOyBqKyspIHtcblx0XHRcdFx0cCA9IHBvaW50c1tqXTtcblx0XHRcdFx0c3RyICs9IChqID8gJ0wnIDogJ00nKSArIHAueCArICcgJyArIHAueTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2xvc2VzIHRoZSByaW5nIGZvciBwb2x5Z29uczsgXCJ4XCIgaXMgVk1MIHN5bnRheFxuXHRcdFx0c3RyICs9IGNsb3NlZCA/IChMLkJyb3dzZXIuc3ZnID8gJ3onIDogJ3gnKSA6ICcnO1xuXHRcdH1cblxuXHRcdC8vIFNWRyBjb21wbGFpbnMgYWJvdXQgZW1wdHkgcGF0aCBzdHJpbmdzXG5cdFx0cmV0dXJuIHN0ciB8fCAnTTAgMCc7XG5cdH1cbn0pO1xuXG5MLkJyb3dzZXIuc3ZnID0gISEoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TICYmIEwuU1ZHLmNyZWF0ZSgnc3ZnJykuY3JlYXRlU1ZHUmVjdCk7XG5cbkwuc3ZnID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0cmV0dXJuIEwuQnJvd3Nlci5zdmcgfHwgTC5Ccm93c2VyLnZtbCA/IG5ldyBMLlNWRyhvcHRpb25zKSA6IG51bGw7XG59O1xuXG5cblxuLypcbiAqIFZlY3RvciByZW5kZXJpbmcgZm9yIElFNy04IHRocm91Z2ggVk1MLlxuICogVGhhbmtzIHRvIERtaXRyeSBCYXJhbm92c2t5IGFuZCBoaXMgUmFwaGFlbCBsaWJyYXJ5IGZvciBpbnNwaXJhdGlvbiFcbiAqL1xuXG5MLkJyb3dzZXIudm1sID0gIUwuQnJvd3Nlci5zdmcgJiYgKGZ1bmN0aW9uICgpIHtcblx0dHJ5IHtcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmlubmVySFRNTCA9ICc8djpzaGFwZSBhZGo9XCIxXCIvPic7XG5cblx0XHR2YXIgc2hhcGUgPSBkaXYuZmlyc3RDaGlsZDtcblx0XHRzaGFwZS5zdHlsZS5iZWhhdmlvciA9ICd1cmwoI2RlZmF1bHQjVk1MKSc7XG5cblx0XHRyZXR1cm4gc2hhcGUgJiYgKHR5cGVvZiBzaGFwZS5hZGogPT09ICdvYmplY3QnKTtcblxuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59KCkpO1xuXG4vLyByZWRlZmluZSBzb21lIFNWRyBtZXRob2RzIHRvIGhhbmRsZSBWTUwgc3ludGF4IHdoaWNoIGlzIHNpbWlsYXIgYnV0IHdpdGggc29tZSBkaWZmZXJlbmNlc1xuTC5TVkcuaW5jbHVkZSghTC5Ccm93c2VyLnZtbCA/IHt9IDoge1xuXG5cdF9pbml0Q29udGFpbmVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtdm1sLWNvbnRhaW5lcicpO1xuXHR9LFxuXG5cdF91cGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5fbWFwLl9hbmltYXRpbmdab29tKSB7IHJldHVybjsgfVxuXHRcdEwuUmVuZGVyZXIucHJvdG90eXBlLl91cGRhdGUuY2FsbCh0aGlzKTtcblx0fSxcblxuXHRfaW5pdFBhdGg6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHZhciBjb250YWluZXIgPSBsYXllci5fY29udGFpbmVyID0gTC5TVkcuY3JlYXRlKCdzaGFwZScpO1xuXG5cdFx0TC5Eb21VdGlsLmFkZENsYXNzKGNvbnRhaW5lciwgJ2xlYWZsZXQtdm1sLXNoYXBlICcgKyAodGhpcy5vcHRpb25zLmNsYXNzTmFtZSB8fCAnJykpO1xuXG5cdFx0Y29udGFpbmVyLmNvb3Jkc2l6ZSA9ICcxIDEnO1xuXG5cdFx0bGF5ZXIuX3BhdGggPSBMLlNWRy5jcmVhdGUoJ3BhdGgnKTtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQobGF5ZXIuX3BhdGgpO1xuXG5cdFx0dGhpcy5fdXBkYXRlU3R5bGUobGF5ZXIpO1xuXHR9LFxuXG5cdF9hZGRQYXRoOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHR2YXIgY29udGFpbmVyID0gbGF5ZXIuX2NvbnRhaW5lcjtcblx0XHR0aGlzLl9jb250YWluZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcblxuXHRcdGlmIChsYXllci5vcHRpb25zLmludGVyYWN0aXZlKSB7XG5cdFx0XHRsYXllci5hZGRJbnRlcmFjdGl2ZVRhcmdldChjb250YWluZXIpO1xuXHRcdH1cblx0fSxcblxuXHRfcmVtb3ZlUGF0aDogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0dmFyIGNvbnRhaW5lciA9IGxheWVyLl9jb250YWluZXI7XG5cdFx0TC5Eb21VdGlsLnJlbW92ZShjb250YWluZXIpO1xuXHRcdGxheWVyLnJlbW92ZUludGVyYWN0aXZlVGFyZ2V0KGNvbnRhaW5lcik7XG5cdH0sXG5cblx0X3VwZGF0ZVN0eWxlOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHR2YXIgc3Ryb2tlID0gbGF5ZXIuX3N0cm9rZSxcblx0XHQgICAgZmlsbCA9IGxheWVyLl9maWxsLFxuXHRcdCAgICBvcHRpb25zID0gbGF5ZXIub3B0aW9ucyxcblx0XHQgICAgY29udGFpbmVyID0gbGF5ZXIuX2NvbnRhaW5lcjtcblxuXHRcdGNvbnRhaW5lci5zdHJva2VkID0gISFvcHRpb25zLnN0cm9rZTtcblx0XHRjb250YWluZXIuZmlsbGVkID0gISFvcHRpb25zLmZpbGw7XG5cblx0XHRpZiAob3B0aW9ucy5zdHJva2UpIHtcblx0XHRcdGlmICghc3Ryb2tlKSB7XG5cdFx0XHRcdHN0cm9rZSA9IGxheWVyLl9zdHJva2UgPSBMLlNWRy5jcmVhdGUoJ3N0cm9rZScpO1xuXHRcdFx0fVxuXHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHN0cm9rZSk7XG5cdFx0XHRzdHJva2Uud2VpZ2h0ID0gb3B0aW9ucy53ZWlnaHQgKyAncHgnO1xuXHRcdFx0c3Ryb2tlLmNvbG9yID0gb3B0aW9ucy5jb2xvcjtcblx0XHRcdHN0cm9rZS5vcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xuXG5cdFx0XHRpZiAob3B0aW9ucy5kYXNoQXJyYXkpIHtcblx0XHRcdFx0c3Ryb2tlLmRhc2hTdHlsZSA9IEwuVXRpbC5pc0FycmF5KG9wdGlvbnMuZGFzaEFycmF5KSA/XG5cdFx0XHRcdCAgICBvcHRpb25zLmRhc2hBcnJheS5qb2luKCcgJykgOlxuXHRcdFx0XHQgICAgb3B0aW9ucy5kYXNoQXJyYXkucmVwbGFjZSgvKCAqLCAqKS9nLCAnICcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c3Ryb2tlLmRhc2hTdHlsZSA9ICcnO1xuXHRcdFx0fVxuXHRcdFx0c3Ryb2tlLmVuZGNhcCA9IG9wdGlvbnMubGluZUNhcC5yZXBsYWNlKCdidXR0JywgJ2ZsYXQnKTtcblx0XHRcdHN0cm9rZS5qb2luc3R5bGUgPSBvcHRpb25zLmxpbmVKb2luO1xuXG5cdFx0fSBlbHNlIGlmIChzdHJva2UpIHtcblx0XHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChzdHJva2UpO1xuXHRcdFx0bGF5ZXIuX3N0cm9rZSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdGlvbnMuZmlsbCkge1xuXHRcdFx0aWYgKCFmaWxsKSB7XG5cdFx0XHRcdGZpbGwgPSBsYXllci5fZmlsbCA9IEwuU1ZHLmNyZWF0ZSgnZmlsbCcpO1xuXHRcdFx0fVxuXHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGZpbGwpO1xuXHRcdFx0ZmlsbC5jb2xvciA9IG9wdGlvbnMuZmlsbENvbG9yIHx8IG9wdGlvbnMuY29sb3I7XG5cdFx0XHRmaWxsLm9wYWNpdHkgPSBvcHRpb25zLmZpbGxPcGFjaXR5O1xuXG5cdFx0fSBlbHNlIGlmIChmaWxsKSB7XG5cdFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoZmlsbCk7XG5cdFx0XHRsYXllci5fZmlsbCA9IG51bGw7XG5cdFx0fVxuXHR9LFxuXG5cdF91cGRhdGVDaXJjbGU6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHZhciBwID0gbGF5ZXIuX3BvaW50LnJvdW5kKCksXG5cdFx0ICAgIHIgPSBNYXRoLnJvdW5kKGxheWVyLl9yYWRpdXMpLFxuXHRcdCAgICByMiA9IE1hdGgucm91bmQobGF5ZXIuX3JhZGl1c1kgfHwgcik7XG5cblx0XHR0aGlzLl9zZXRQYXRoKGxheWVyLCBsYXllci5fZW1wdHkoKSA/ICdNMCAwJyA6XG5cdFx0XHRcdCdBTCAnICsgcC54ICsgJywnICsgcC55ICsgJyAnICsgciArICcsJyArIHIyICsgJyAwLCcgKyAoNjU1MzUgKiAzNjApKTtcblx0fSxcblxuXHRfc2V0UGF0aDogZnVuY3Rpb24gKGxheWVyLCBwYXRoKSB7XG5cdFx0bGF5ZXIuX3BhdGgudiA9IHBhdGg7XG5cdH0sXG5cblx0X2JyaW5nVG9Gcm9udDogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0TC5Eb21VdGlsLnRvRnJvbnQobGF5ZXIuX2NvbnRhaW5lcik7XG5cdH0sXG5cblx0X2JyaW5nVG9CYWNrOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHRMLkRvbVV0aWwudG9CYWNrKGxheWVyLl9jb250YWluZXIpO1xuXHR9XG59KTtcblxuaWYgKEwuQnJvd3Nlci52bWwpIHtcblx0TC5TVkcuY3JlYXRlID0gKGZ1bmN0aW9uICgpIHtcblx0XHR0cnkge1xuXHRcdFx0ZG9jdW1lbnQubmFtZXNwYWNlcy5hZGQoJ2x2bWwnLCAndXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTp2bWwnKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnPGx2bWw6JyArIG5hbWUgKyAnIGNsYXNzPVwibHZtbFwiPicpO1xuXHRcdFx0fTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJzwnICsgbmFtZSArICcgeG1sbnM9XCJ1cm46c2NoZW1hcy1taWNyb3NvZnQuY29tOnZtbFwiIGNsYXNzPVwibHZtbFwiPicpO1xuXHRcdFx0fTtcblx0XHR9XG5cdH0pKCk7XG59XG5cblxuXG4vKlxuICogTC5DYW52YXMgaGFuZGxlcyBDYW52YXMgdmVjdG9yIGxheWVycyByZW5kZXJpbmcgYW5kIG1vdXNlIGV2ZW50cyBoYW5kbGluZy4gQWxsIENhbnZhcy1zcGVjaWZpYyBjb2RlIGdvZXMgaGVyZS5cbiAqL1xuXG5MLkNhbnZhcyA9IEwuUmVuZGVyZXIuZXh0ZW5kKHtcblxuXHRvbkFkZDogZnVuY3Rpb24gKCkge1xuXHRcdEwuUmVuZGVyZXIucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcyk7XG5cblx0XHR0aGlzLl9sYXllcnMgPSB0aGlzLl9sYXllcnMgfHwge307XG5cblx0XHQvLyBSZWRyYXcgdmVjdG9ycyBzaW5jZSBjYW52YXMgaXMgY2xlYXJlZCB1cG9uIHJlbW92YWwsXG5cdFx0Ly8gaW4gY2FzZSBvZiByZW1vdmluZyB0aGUgcmVuZGVyZXIgaXRzZWxmIGZyb20gdGhlIG1hcC5cblx0XHR0aGlzLl9kcmF3KCk7XG5cdH0sXG5cblx0X2luaXRDb250YWluZXI6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgY29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRMLkRvbUV2ZW50XG5cdFx0XHQub24oY29udGFpbmVyLCAnbW91c2Vtb3ZlJywgTC5VdGlsLnRocm90dGxlKHRoaXMuX29uTW91c2VNb3ZlLCAzMiwgdGhpcyksIHRoaXMpXG5cdFx0XHQub24oY29udGFpbmVyLCAnY2xpY2sgZGJsY2xpY2sgbW91c2Vkb3duIG1vdXNldXAgY29udGV4dG1lbnUnLCB0aGlzLl9vbkNsaWNrLCB0aGlzKVxuXHRcdFx0Lm9uKGNvbnRhaW5lciwgJ21vdXNlb3V0JywgdGhpcy5faGFuZGxlTW91c2VPdXQsIHRoaXMpO1xuXG5cdFx0dGhpcy5fY3R4ID0gY29udGFpbmVyLmdldENvbnRleHQoJzJkJyk7XG5cdH0sXG5cblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9tYXAuX2FuaW1hdGluZ1pvb20gJiYgdGhpcy5fYm91bmRzKSB7IHJldHVybjsgfVxuXG5cdFx0dGhpcy5fZHJhd25MYXllcnMgPSB7fTtcblxuXHRcdEwuUmVuZGVyZXIucHJvdG90eXBlLl91cGRhdGUuY2FsbCh0aGlzKTtcblxuXHRcdHZhciBiID0gdGhpcy5fYm91bmRzLFxuXHRcdCAgICBjb250YWluZXIgPSB0aGlzLl9jb250YWluZXIsXG5cdFx0ICAgIHNpemUgPSBiLmdldFNpemUoKSxcblx0XHQgICAgbSA9IEwuQnJvd3Nlci5yZXRpbmEgPyAyIDogMTtcblxuXHRcdEwuRG9tVXRpbC5zZXRQb3NpdGlvbihjb250YWluZXIsIGIubWluKTtcblxuXHRcdC8vIHNldCBjYW52YXMgc2l6ZSAoYWxzbyBjbGVhcmluZyBpdCk7IHVzZSBkb3VibGUgc2l6ZSBvbiByZXRpbmFcblx0XHRjb250YWluZXIud2lkdGggPSBtICogc2l6ZS54O1xuXHRcdGNvbnRhaW5lci5oZWlnaHQgPSBtICogc2l6ZS55O1xuXHRcdGNvbnRhaW5lci5zdHlsZS53aWR0aCA9IHNpemUueCArICdweCc7XG5cdFx0Y29udGFpbmVyLnN0eWxlLmhlaWdodCA9IHNpemUueSArICdweCc7XG5cblx0XHRpZiAoTC5Ccm93c2VyLnJldGluYSkge1xuXHRcdFx0dGhpcy5fY3R4LnNjYWxlKDIsIDIpO1xuXHRcdH1cblxuXHRcdC8vIHRyYW5zbGF0ZSBzbyB3ZSB1c2UgdGhlIHNhbWUgcGF0aCBjb29yZGluYXRlcyBhZnRlciBjYW52YXMgZWxlbWVudCBtb3Zlc1xuXHRcdHRoaXMuX2N0eC50cmFuc2xhdGUoLWIubWluLngsIC1iLm1pbi55KTtcblx0fSxcblxuXHRfaW5pdFBhdGg6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdHRoaXMuX2xheWVyc1tMLnN0YW1wKGxheWVyKV0gPSBsYXllcjtcblx0fSxcblxuXHRfYWRkUGF0aDogTC5VdGlsLmZhbHNlRm4sXG5cblx0X3JlbW92ZVBhdGg6IGZ1bmN0aW9uIChsYXllcikge1xuXHRcdGxheWVyLl9yZW1vdmVkID0gdHJ1ZTtcblx0XHR0aGlzLl9yZXF1ZXN0UmVkcmF3KGxheWVyKTtcblx0fSxcblxuXHRfdXBkYXRlUGF0aDogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0dGhpcy5fcmVkcmF3Qm91bmRzID0gbGF5ZXIuX3B4Qm91bmRzO1xuXHRcdHRoaXMuX2RyYXcodHJ1ZSk7XG5cdFx0bGF5ZXIuX3Byb2plY3QoKTtcblx0XHRsYXllci5fdXBkYXRlKCk7XG5cdFx0dGhpcy5fZHJhdygpO1xuXHRcdHRoaXMuX3JlZHJhd0JvdW5kcyA9IG51bGw7XG5cdH0sXG5cblx0X3VwZGF0ZVN0eWxlOiBmdW5jdGlvbiAobGF5ZXIpIHtcblx0XHR0aGlzLl9yZXF1ZXN0UmVkcmF3KGxheWVyKTtcblx0fSxcblxuXHRfcmVxdWVzdFJlZHJhdzogZnVuY3Rpb24gKGxheWVyKSB7XG5cdFx0aWYgKCF0aGlzLl9tYXApIHsgcmV0dXJuOyB9XG5cblx0XHR2YXIgcGFkZGluZyA9IChsYXllci5vcHRpb25zLndlaWdodCB8fCAwKSArIDE7XG5cdFx0dGhpcy5fcmVkcmF3Qm91bmRzID0gdGhpcy5fcmVkcmF3Qm91bmRzIHx8IG5ldyBMLkJvdW5kcygpO1xuXHRcdHRoaXMuX3JlZHJhd0JvdW5kcy5leHRlbmQobGF5ZXIuX3B4Qm91bmRzLm1pbi5zdWJ0cmFjdChbcGFkZGluZywgcGFkZGluZ10pKTtcblx0XHR0aGlzLl9yZWRyYXdCb3VuZHMuZXh0ZW5kKGxheWVyLl9weEJvdW5kcy5tYXguYWRkKFtwYWRkaW5nLCBwYWRkaW5nXSkpO1xuXG5cdFx0dGhpcy5fcmVkcmF3UmVxdWVzdCA9IHRoaXMuX3JlZHJhd1JlcXVlc3QgfHwgTC5VdGlsLnJlcXVlc3RBbmltRnJhbWUodGhpcy5fcmVkcmF3LCB0aGlzKTtcblx0fSxcblxuXHRfcmVkcmF3OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fcmVkcmF3UmVxdWVzdCA9IG51bGw7XG5cblx0XHR0aGlzLl9kcmF3KHRydWUpOyAvLyBjbGVhciBsYXllcnMgaW4gcmVkcmF3IGJvdW5kc1xuXHRcdHRoaXMuX2RyYXcoKTsgLy8gZHJhdyBsYXllcnNcblxuXHRcdHRoaXMuX3JlZHJhd0JvdW5kcyA9IG51bGw7XG5cdH0sXG5cblx0X2RyYXc6IGZ1bmN0aW9uIChjbGVhcikge1xuXHRcdHRoaXMuX2NsZWFyID0gY2xlYXI7XG5cdFx0dmFyIGxheWVyLCBib3VuZHMgPSB0aGlzLl9yZWRyYXdCb3VuZHM7XG5cdFx0dGhpcy5fY3R4LnNhdmUoKTtcblx0XHRpZiAoYm91bmRzKSB7XG5cdFx0XHR0aGlzLl9jdHguYmVnaW5QYXRoKCk7XG5cdFx0XHR0aGlzLl9jdHgucmVjdChib3VuZHMubWluLngsIGJvdW5kcy5taW4ueSwgYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54LCBib3VuZHMubWF4LnkgLSBib3VuZHMubWluLnkpO1xuXHRcdFx0dGhpcy5fY3R4LmNsaXAoKTtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLl9sYXllcnMpIHtcblx0XHRcdGxheWVyID0gdGhpcy5fbGF5ZXJzW2lkXTtcblx0XHRcdGlmICghYm91bmRzIHx8IGxheWVyLl9weEJvdW5kcy5pbnRlcnNlY3RzKGJvdW5kcykpIHtcblx0XHRcdFx0bGF5ZXIuX3VwZGF0ZVBhdGgoKTtcblx0XHRcdH1cblx0XHRcdGlmIChjbGVhciAmJiBsYXllci5fcmVtb3ZlZCkge1xuXHRcdFx0XHRkZWxldGUgbGF5ZXIuX3JlbW92ZWQ7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9sYXllcnNbaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLl9jdHgucmVzdG9yZSgpOyAgLy8gUmVzdG9yZSBzdGF0ZSBiZWZvcmUgY2xpcHBpbmcuXG5cdH0sXG5cblx0X3VwZGF0ZVBvbHk6IGZ1bmN0aW9uIChsYXllciwgY2xvc2VkKSB7XG5cblx0XHR2YXIgaSwgaiwgbGVuMiwgcCxcblx0XHQgICAgcGFydHMgPSBsYXllci5fcGFydHMsXG5cdFx0ICAgIGxlbiA9IHBhcnRzLmxlbmd0aCxcblx0XHQgICAgY3R4ID0gdGhpcy5fY3R4O1xuXG5cdFx0aWYgKCFsZW4pIHsgcmV0dXJuOyB9XG5cblx0XHR0aGlzLl9kcmF3bkxheWVyc1tsYXllci5fbGVhZmxldF9pZF0gPSBsYXllcjtcblxuXHRcdGN0eC5iZWdpblBhdGgoKTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0Zm9yIChqID0gMCwgbGVuMiA9IHBhcnRzW2ldLmxlbmd0aDsgaiA8IGxlbjI7IGorKykge1xuXHRcdFx0XHRwID0gcGFydHNbaV1bal07XG5cdFx0XHRcdGN0eFtqID8gJ2xpbmVUbycgOiAnbW92ZVRvJ10ocC54LCBwLnkpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNsb3NlZCkge1xuXHRcdFx0XHRjdHguY2xvc2VQYXRoKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fZmlsbFN0cm9rZShjdHgsIGxheWVyKTtcblxuXHRcdC8vIFRPRE8gb3B0aW1pemF0aW9uOiAxIGZpbGwvc3Ryb2tlIGZvciBhbGwgZmVhdHVyZXMgd2l0aCBlcXVhbCBzdHlsZSBpbnN0ZWFkIG9mIDEgZm9yIGVhY2ggZmVhdHVyZVxuXHR9LFxuXG5cdF91cGRhdGVDaXJjbGU6IGZ1bmN0aW9uIChsYXllcikge1xuXG5cdFx0aWYgKGxheWVyLl9lbXB0eSgpKSB7IHJldHVybjsgfVxuXG5cdFx0dmFyIHAgPSBsYXllci5fcG9pbnQsXG5cdFx0ICAgIGN0eCA9IHRoaXMuX2N0eCxcblx0XHQgICAgciA9IGxheWVyLl9yYWRpdXMsXG5cdFx0ICAgIHMgPSAobGF5ZXIuX3JhZGl1c1kgfHwgcikgLyByO1xuXG5cdFx0aWYgKHMgIT09IDEpIHtcblx0XHRcdGN0eC5zYXZlKCk7XG5cdFx0XHRjdHguc2NhbGUoMSwgcyk7XG5cdFx0fVxuXG5cdFx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRcdGN0eC5hcmMocC54LCBwLnkgLyBzLCByLCAwLCBNYXRoLlBJICogMiwgZmFsc2UpO1xuXG5cdFx0aWYgKHMgIT09IDEpIHtcblx0XHRcdGN0eC5yZXN0b3JlKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fZmlsbFN0cm9rZShjdHgsIGxheWVyKTtcblx0fSxcblxuXHRfZmlsbFN0cm9rZTogZnVuY3Rpb24gKGN0eCwgbGF5ZXIpIHtcblx0XHR2YXIgY2xlYXIgPSB0aGlzLl9jbGVhcixcblx0XHQgICAgb3B0aW9ucyA9IGxheWVyLm9wdGlvbnM7XG5cblx0XHRjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gY2xlYXIgPyAnZGVzdGluYXRpb24tb3V0JyA6ICdzb3VyY2Utb3Zlcic7XG5cblx0XHRpZiAob3B0aW9ucy5maWxsKSB7XG5cdFx0XHRjdHguZ2xvYmFsQWxwaGEgPSBjbGVhciA/IDEgOiBvcHRpb25zLmZpbGxPcGFjaXR5O1xuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IG9wdGlvbnMuZmlsbENvbG9yIHx8IG9wdGlvbnMuY29sb3I7XG5cdFx0XHRjdHguZmlsbChvcHRpb25zLmZpbGxSdWxlIHx8ICdldmVub2RkJyk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdGlvbnMuc3Ryb2tlICYmIG9wdGlvbnMud2VpZ2h0ICE9PSAwKSB7XG5cdFx0XHRjdHguZ2xvYmFsQWxwaGEgPSBjbGVhciA/IDEgOiBvcHRpb25zLm9wYWNpdHk7XG5cblx0XHRcdC8vIGlmIGNsZWFyaW5nIHNoYXBlLCBkbyBpdCB3aXRoIHRoZSBwcmV2aW91c2x5IGRyYXduIGxpbmUgd2lkdGhcblx0XHRcdGxheWVyLl9wcmV2V2VpZ2h0ID0gY3R4LmxpbmVXaWR0aCA9IGNsZWFyID8gbGF5ZXIuX3ByZXZXZWlnaHQgKyAxIDogb3B0aW9ucy53ZWlnaHQ7XG5cblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IG9wdGlvbnMuY29sb3I7XG5cdFx0XHRjdHgubGluZUNhcCA9IG9wdGlvbnMubGluZUNhcDtcblx0XHRcdGN0eC5saW5lSm9pbiA9IG9wdGlvbnMubGluZUpvaW47XG5cdFx0XHRjdHguc3Ryb2tlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIENhbnZhcyBvYnZpb3VzbHkgZG9lc24ndCBoYXZlIG1vdXNlIGV2ZW50cyBmb3IgaW5kaXZpZHVhbCBkcmF3biBvYmplY3RzLFxuXHQvLyBzbyB3ZSBlbXVsYXRlIHRoYXQgYnkgY2FsY3VsYXRpbmcgd2hhdCdzIHVuZGVyIHRoZSBtb3VzZSBvbiBtb3VzZW1vdmUvY2xpY2sgbWFudWFsbHlcblxuXHRfb25DbGljazogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgcG9pbnQgPSB0aGlzLl9tYXAubW91c2VFdmVudFRvTGF5ZXJQb2ludChlKSwgbGF5ZXJzID0gW107XG5cblx0XHRmb3IgKHZhciBpZCBpbiB0aGlzLl9sYXllcnMpIHtcblx0XHRcdGlmICh0aGlzLl9sYXllcnNbaWRdLl9jb250YWluc1BvaW50KHBvaW50KSkge1xuXHRcdFx0XHRMLkRvbUV2ZW50Ll9mYWtlU3RvcChlKTtcblx0XHRcdFx0bGF5ZXJzLnB1c2godGhpcy5fbGF5ZXJzW2lkXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChsYXllcnMubGVuZ3RoKSAge1xuXHRcdFx0dGhpcy5fZmlyZUV2ZW50KGxheWVycywgZSk7XG5cdFx0fVxuXHR9LFxuXG5cdF9vbk1vdXNlTW92ZTogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoIXRoaXMuX21hcCB8fCB0aGlzLl9tYXAuZHJhZ2dpbmcuX2RyYWdnYWJsZS5fbW92aW5nIHx8IHRoaXMuX21hcC5fYW5pbWF0aW5nWm9vbSkgeyByZXR1cm47IH1cblxuXHRcdHZhciBwb2ludCA9IHRoaXMuX21hcC5tb3VzZUV2ZW50VG9MYXllclBvaW50KGUpO1xuXHRcdHRoaXMuX2hhbmRsZU1vdXNlT3V0KGUsIHBvaW50KTtcblx0XHR0aGlzLl9oYW5kbGVNb3VzZUhvdmVyKGUsIHBvaW50KTtcblx0fSxcblxuXG5cdF9oYW5kbGVNb3VzZU91dDogZnVuY3Rpb24gKGUsIHBvaW50KSB7XG5cdFx0dmFyIGxheWVyID0gdGhpcy5faG92ZXJlZExheWVyO1xuXHRcdGlmIChsYXllciAmJiAoZS50eXBlID09PSAnbW91c2VvdXQnIHx8ICFsYXllci5fY29udGFpbnNQb2ludChwb2ludCkpKSB7XG5cdFx0XHQvLyBpZiB3ZSdyZSBsZWF2aW5nIHRoZSBsYXllciwgZmlyZSBtb3VzZW91dFxuXHRcdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKHRoaXMuX2NvbnRhaW5lciwgJ2xlYWZsZXQtaW50ZXJhY3RpdmUnKTtcblx0XHRcdHRoaXMuX2ZpcmVFdmVudChbbGF5ZXJdLCBlLCAnbW91c2VvdXQnKTtcblx0XHRcdHRoaXMuX2hvdmVyZWRMYXllciA9IG51bGw7XG5cdFx0fVxuXHR9LFxuXG5cdF9oYW5kbGVNb3VzZUhvdmVyOiBmdW5jdGlvbiAoZSwgcG9pbnQpIHtcblx0XHR2YXIgaWQsIGxheWVyO1xuXHRcdGlmICghdGhpcy5faG92ZXJlZExheWVyKSB7XG5cdFx0XHRmb3IgKGlkIGluIHRoaXMuX2RyYXduTGF5ZXJzKSB7XG5cdFx0XHRcdGxheWVyID0gdGhpcy5fZHJhd25MYXllcnNbaWRdO1xuXHRcdFx0XHRpZiAobGF5ZXIub3B0aW9ucy5pbnRlcmFjdGl2ZSAmJiBsYXllci5fY29udGFpbnNQb2ludChwb2ludCkpIHtcblx0XHRcdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1pbnRlcmFjdGl2ZScpOyAvLyBjaGFuZ2UgY3Vyc29yXG5cdFx0XHRcdFx0dGhpcy5fZmlyZUV2ZW50KFtsYXllcl0sIGUsICdtb3VzZW92ZXInKTtcblx0XHRcdFx0XHR0aGlzLl9ob3ZlcmVkTGF5ZXIgPSBsYXllcjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAodGhpcy5faG92ZXJlZExheWVyKSB7XG5cdFx0XHR0aGlzLl9maXJlRXZlbnQoW3RoaXMuX2hvdmVyZWRMYXllcl0sIGUpO1xuXHRcdH1cblx0fSxcblxuXHRfZmlyZUV2ZW50OiBmdW5jdGlvbiAobGF5ZXJzLCBlLCB0eXBlKSB7XG5cdFx0dGhpcy5fbWFwLl9maXJlRE9NRXZlbnQoZSwgdHlwZSB8fCBlLnR5cGUsIGxheWVycyk7XG5cdH0sXG5cblx0Ly8gVE9ETyBfYnJpbmdUb0Zyb250ICYgX2JyaW5nVG9CYWNrLCBwcmV0dHkgdHJpY2t5XG5cblx0X2JyaW5nVG9Gcm9udDogTC5VdGlsLmZhbHNlRm4sXG5cdF9icmluZ1RvQmFjazogTC5VdGlsLmZhbHNlRm5cbn0pO1xuXG5MLkJyb3dzZXIuY2FudmFzID0gKGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuICEhZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dDtcbn0oKSk7XG5cbkwuY2FudmFzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0cmV0dXJuIEwuQnJvd3Nlci5jYW52YXMgPyBuZXcgTC5DYW52YXMob3B0aW9ucykgOiBudWxsO1xufTtcblxuTC5Qb2x5bGluZS5wcm90b3R5cGUuX2NvbnRhaW5zUG9pbnQgPSBmdW5jdGlvbiAocCwgY2xvc2VkKSB7XG5cdHZhciBpLCBqLCBrLCBsZW4sIGxlbjIsIHBhcnQsXG5cdCAgICB3ID0gdGhpcy5fY2xpY2tUb2xlcmFuY2UoKTtcblxuXHRpZiAoIXRoaXMuX3B4Qm91bmRzLmNvbnRhaW5zKHApKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdC8vIGhpdCBkZXRlY3Rpb24gZm9yIHBvbHlsaW5lc1xuXHRmb3IgKGkgPSAwLCBsZW4gPSB0aGlzLl9wYXJ0cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdHBhcnQgPSB0aGlzLl9wYXJ0c1tpXTtcblxuXHRcdGZvciAoaiA9IDAsIGxlbjIgPSBwYXJ0Lmxlbmd0aCwgayA9IGxlbjIgLSAxOyBqIDwgbGVuMjsgayA9IGorKykge1xuXHRcdFx0aWYgKCFjbG9zZWQgJiYgKGogPT09IDApKSB7IGNvbnRpbnVlOyB9XG5cblx0XHRcdGlmIChMLkxpbmVVdGlsLnBvaW50VG9TZWdtZW50RGlzdGFuY2UocCwgcGFydFtrXSwgcGFydFtqXSkgPD0gdykge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufTtcblxuTC5Qb2x5Z29uLnByb3RvdHlwZS5fY29udGFpbnNQb2ludCA9IGZ1bmN0aW9uIChwKSB7XG5cdHZhciBpbnNpZGUgPSBmYWxzZSxcblx0ICAgIHBhcnQsIHAxLCBwMiwgaSwgaiwgaywgbGVuLCBsZW4yO1xuXG5cdGlmICghdGhpcy5fcHhCb3VuZHMuY29udGFpbnMocCkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gcmF5IGNhc3RpbmcgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgaWYgcG9pbnQgaXMgaW4gcG9seWdvblxuXHRmb3IgKGkgPSAwLCBsZW4gPSB0aGlzLl9wYXJ0cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdHBhcnQgPSB0aGlzLl9wYXJ0c1tpXTtcblxuXHRcdGZvciAoaiA9IDAsIGxlbjIgPSBwYXJ0Lmxlbmd0aCwgayA9IGxlbjIgLSAxOyBqIDwgbGVuMjsgayA9IGorKykge1xuXHRcdFx0cDEgPSBwYXJ0W2pdO1xuXHRcdFx0cDIgPSBwYXJ0W2tdO1xuXG5cdFx0XHRpZiAoKChwMS55ID4gcC55KSAhPT0gKHAyLnkgPiBwLnkpKSAmJiAocC54IDwgKHAyLnggLSBwMS54KSAqIChwLnkgLSBwMS55KSAvIChwMi55IC0gcDEueSkgKyBwMS54KSkge1xuXHRcdFx0XHRpbnNpZGUgPSAhaW5zaWRlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIGFsc28gY2hlY2sgaWYgaXQncyBvbiBwb2x5Z29uIHN0cm9rZVxuXHRyZXR1cm4gaW5zaWRlIHx8IEwuUG9seWxpbmUucHJvdG90eXBlLl9jb250YWluc1BvaW50LmNhbGwodGhpcywgcCwgdHJ1ZSk7XG59O1xuXG5MLkNpcmNsZU1hcmtlci5wcm90b3R5cGUuX2NvbnRhaW5zUG9pbnQgPSBmdW5jdGlvbiAocCkge1xuXHRyZXR1cm4gcC5kaXN0YW5jZVRvKHRoaXMuX3BvaW50KSA8PSB0aGlzLl9yYWRpdXMgKyB0aGlzLl9jbGlja1RvbGVyYW5jZSgpO1xufTtcblxuXG5cbi8qXHJcbiAqIEwuR2VvSlNPTiB0dXJucyBhbnkgR2VvSlNPTiBkYXRhIGludG8gYSBMZWFmbGV0IGxheWVyLlxyXG4gKi9cclxuXHJcbkwuR2VvSlNPTiA9IEwuRmVhdHVyZUdyb3VwLmV4dGVuZCh7XHJcblxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChnZW9qc29uLCBvcHRpb25zKSB7XHJcblx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XHJcblxyXG5cdFx0dGhpcy5fbGF5ZXJzID0ge307XHJcblxyXG5cdFx0aWYgKGdlb2pzb24pIHtcclxuXHRcdFx0dGhpcy5hZGREYXRhKGdlb2pzb24pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdGFkZERhdGE6IGZ1bmN0aW9uIChnZW9qc29uKSB7XHJcblx0XHR2YXIgZmVhdHVyZXMgPSBMLlV0aWwuaXNBcnJheShnZW9qc29uKSA/IGdlb2pzb24gOiBnZW9qc29uLmZlYXR1cmVzLFxyXG5cdFx0ICAgIGksIGxlbiwgZmVhdHVyZTtcclxuXHJcblx0XHRpZiAoZmVhdHVyZXMpIHtcclxuXHRcdFx0Zm9yIChpID0gMCwgbGVuID0gZmVhdHVyZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHQvLyBvbmx5IGFkZCB0aGlzIGlmIGdlb21ldHJ5IG9yIGdlb21ldHJpZXMgYXJlIHNldCBhbmQgbm90IG51bGxcclxuXHRcdFx0XHRmZWF0dXJlID0gZmVhdHVyZXNbaV07XHJcblx0XHRcdFx0aWYgKGZlYXR1cmUuZ2VvbWV0cmllcyB8fCBmZWF0dXJlLmdlb21ldHJ5IHx8IGZlYXR1cmUuZmVhdHVyZXMgfHwgZmVhdHVyZS5jb29yZGluYXRlcykge1xyXG5cdFx0XHRcdFx0dGhpcy5hZGREYXRhKGZlYXR1cmUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcclxuXHJcblx0XHRpZiAob3B0aW9ucy5maWx0ZXIgJiYgIW9wdGlvbnMuZmlsdGVyKGdlb2pzb24pKSB7IHJldHVybiB0aGlzOyB9XHJcblxyXG5cdFx0dmFyIGxheWVyID0gTC5HZW9KU09OLmdlb21ldHJ5VG9MYXllcihnZW9qc29uLCBvcHRpb25zKTtcclxuXHRcdGlmICghbGF5ZXIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRsYXllci5mZWF0dXJlID0gTC5HZW9KU09OLmFzRmVhdHVyZShnZW9qc29uKTtcclxuXHJcblx0XHRsYXllci5kZWZhdWx0T3B0aW9ucyA9IGxheWVyLm9wdGlvbnM7XHJcblx0XHR0aGlzLnJlc2V0U3R5bGUobGF5ZXIpO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLm9uRWFjaEZlYXR1cmUpIHtcclxuXHRcdFx0b3B0aW9ucy5vbkVhY2hGZWF0dXJlKGdlb2pzb24sIGxheWVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5hZGRMYXllcihsYXllcik7XHJcblx0fSxcclxuXHJcblx0cmVzZXRTdHlsZTogZnVuY3Rpb24gKGxheWVyKSB7XHJcblx0XHQvLyByZXNldCBhbnkgY3VzdG9tIHN0eWxlc1xyXG5cdFx0bGF5ZXIub3B0aW9ucyA9IGxheWVyLmRlZmF1bHRPcHRpb25zO1xyXG5cdFx0dGhpcy5fc2V0TGF5ZXJTdHlsZShsYXllciwgdGhpcy5vcHRpb25zLnN0eWxlKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNldFN0eWxlOiBmdW5jdGlvbiAoc3R5bGUpIHtcclxuXHRcdHJldHVybiB0aGlzLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdFx0dGhpcy5fc2V0TGF5ZXJTdHlsZShsYXllciwgc3R5bGUpO1xyXG5cdFx0fSwgdGhpcyk7XHJcblx0fSxcclxuXHJcblx0X3NldExheWVyU3R5bGU6IGZ1bmN0aW9uIChsYXllciwgc3R5bGUpIHtcclxuXHRcdGlmICh0eXBlb2Ygc3R5bGUgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0c3R5bGUgPSBzdHlsZShsYXllci5mZWF0dXJlKTtcclxuXHRcdH1cclxuXHRcdGlmIChsYXllci5zZXRTdHlsZSkge1xyXG5cdFx0XHRsYXllci5zZXRTdHlsZShzdHlsZSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcbkwuZXh0ZW5kKEwuR2VvSlNPTiwge1xyXG5cdGdlb21ldHJ5VG9MYXllcjogZnVuY3Rpb24gKGdlb2pzb24sIG9wdGlvbnMpIHtcclxuXHJcblx0XHR2YXIgZ2VvbWV0cnkgPSBnZW9qc29uLnR5cGUgPT09ICdGZWF0dXJlJyA/IGdlb2pzb24uZ2VvbWV0cnkgOiBnZW9qc29uLFxyXG5cdFx0ICAgIGNvb3JkcyA9IGdlb21ldHJ5ID8gZ2VvbWV0cnkuY29vcmRpbmF0ZXMgOiBudWxsLFxyXG5cdFx0ICAgIGxheWVycyA9IFtdLFxyXG5cdFx0ICAgIHBvaW50VG9MYXllciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wb2ludFRvTGF5ZXIsXHJcblx0XHQgICAgY29vcmRzVG9MYXRMbmcgPSBvcHRpb25zICYmIG9wdGlvbnMuY29vcmRzVG9MYXRMbmcgfHwgdGhpcy5jb29yZHNUb0xhdExuZyxcclxuXHRcdCAgICBsYXRsbmcsIGxhdGxuZ3MsIGksIGxlbjtcclxuXHJcblx0XHRpZiAoIWNvb3JkcyAmJiAhZ2VvbWV0cnkpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0c3dpdGNoIChnZW9tZXRyeS50eXBlKSB7XHJcblx0XHRjYXNlICdQb2ludCc6XHJcblx0XHRcdGxhdGxuZyA9IGNvb3Jkc1RvTGF0TG5nKGNvb3Jkcyk7XHJcblx0XHRcdHJldHVybiBwb2ludFRvTGF5ZXIgPyBwb2ludFRvTGF5ZXIoZ2VvanNvbiwgbGF0bG5nKSA6IG5ldyBMLk1hcmtlcihsYXRsbmcpO1xyXG5cclxuXHRcdGNhc2UgJ011bHRpUG9pbnQnOlxyXG5cdFx0XHRmb3IgKGkgPSAwLCBsZW4gPSBjb29yZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHRsYXRsbmcgPSBjb29yZHNUb0xhdExuZyhjb29yZHNbaV0pO1xyXG5cdFx0XHRcdGxheWVycy5wdXNoKHBvaW50VG9MYXllciA/IHBvaW50VG9MYXllcihnZW9qc29uLCBsYXRsbmcpIDogbmV3IEwuTWFya2VyKGxhdGxuZykpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBuZXcgTC5GZWF0dXJlR3JvdXAobGF5ZXJzKTtcclxuXHJcblx0XHRjYXNlICdMaW5lU3RyaW5nJzpcclxuXHRcdGNhc2UgJ011bHRpTGluZVN0cmluZyc6XHJcblx0XHRcdGxhdGxuZ3MgPSB0aGlzLmNvb3Jkc1RvTGF0TG5ncyhjb29yZHMsIGdlb21ldHJ5LnR5cGUgPT09ICdMaW5lU3RyaW5nJyA/IDAgOiAxLCBjb29yZHNUb0xhdExuZyk7XHJcblx0XHRcdHJldHVybiBuZXcgTC5Qb2x5bGluZShsYXRsbmdzLCBvcHRpb25zKTtcclxuXHJcblx0XHRjYXNlICdQb2x5Z29uJzpcclxuXHRcdGNhc2UgJ011bHRpUG9seWdvbic6XHJcblx0XHRcdGxhdGxuZ3MgPSB0aGlzLmNvb3Jkc1RvTGF0TG5ncyhjb29yZHMsIGdlb21ldHJ5LnR5cGUgPT09ICdQb2x5Z29uJyA/IDEgOiAyLCBjb29yZHNUb0xhdExuZyk7XHJcblx0XHRcdHJldHVybiBuZXcgTC5Qb2x5Z29uKGxhdGxuZ3MsIG9wdGlvbnMpO1xyXG5cclxuXHRcdGNhc2UgJ0dlb21ldHJ5Q29sbGVjdGlvbic6XHJcblx0XHRcdGZvciAoaSA9IDAsIGxlbiA9IGdlb21ldHJ5Lmdlb21ldHJpZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHR2YXIgbGF5ZXIgPSB0aGlzLmdlb21ldHJ5VG9MYXllcih7XHJcblx0XHRcdFx0XHRnZW9tZXRyeTogZ2VvbWV0cnkuZ2VvbWV0cmllc1tpXSxcclxuXHRcdFx0XHRcdHR5cGU6ICdGZWF0dXJlJyxcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IGdlb2pzb24ucHJvcGVydGllc1xyXG5cdFx0XHRcdH0sIG9wdGlvbnMpO1xyXG5cclxuXHRcdFx0XHRpZiAobGF5ZXIpIHtcclxuXHRcdFx0XHRcdGxheWVycy5wdXNoKGxheWVyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG5ldyBMLkZlYXR1cmVHcm91cChsYXllcnMpO1xyXG5cclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBHZW9KU09OIG9iamVjdC4nKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRjb29yZHNUb0xhdExuZzogZnVuY3Rpb24gKGNvb3Jkcykge1xyXG5cdFx0cmV0dXJuIG5ldyBMLkxhdExuZyhjb29yZHNbMV0sIGNvb3Jkc1swXSwgY29vcmRzWzJdKTtcclxuXHR9LFxyXG5cclxuXHRjb29yZHNUb0xhdExuZ3M6IGZ1bmN0aW9uIChjb29yZHMsIGxldmVsc0RlZXAsIGNvb3Jkc1RvTGF0TG5nKSB7XHJcblx0XHR2YXIgbGF0bG5ncyA9IFtdO1xyXG5cclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb29yZHMubGVuZ3RoLCBsYXRsbmc7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRsYXRsbmcgPSBsZXZlbHNEZWVwID9cclxuXHRcdFx0ICAgICAgICB0aGlzLmNvb3Jkc1RvTGF0TG5ncyhjb29yZHNbaV0sIGxldmVsc0RlZXAgLSAxLCBjb29yZHNUb0xhdExuZykgOlxyXG5cdFx0XHQgICAgICAgIChjb29yZHNUb0xhdExuZyB8fCB0aGlzLmNvb3Jkc1RvTGF0TG5nKShjb29yZHNbaV0pO1xyXG5cclxuXHRcdFx0bGF0bG5ncy5wdXNoKGxhdGxuZyk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGxhdGxuZ3M7XHJcblx0fSxcclxuXHJcblx0bGF0TG5nVG9Db29yZHM6IGZ1bmN0aW9uIChsYXRsbmcpIHtcclxuXHRcdHJldHVybiBsYXRsbmcuYWx0ICE9PSB1bmRlZmluZWQgP1xyXG5cdFx0XHRcdFtsYXRsbmcubG5nLCBsYXRsbmcubGF0LCBsYXRsbmcuYWx0XSA6XHJcblx0XHRcdFx0W2xhdGxuZy5sbmcsIGxhdGxuZy5sYXRdO1xyXG5cdH0sXHJcblxyXG5cdGxhdExuZ3NUb0Nvb3JkczogZnVuY3Rpb24gKGxhdGxuZ3MsIGxldmVsc0RlZXAsIGNsb3NlZCkge1xyXG5cdFx0dmFyIGNvb3JkcyA9IFtdO1xyXG5cclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsYXRsbmdzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdGNvb3Jkcy5wdXNoKGxldmVsc0RlZXAgP1xyXG5cdFx0XHRcdEwuR2VvSlNPTi5sYXRMbmdzVG9Db29yZHMobGF0bG5nc1tpXSwgbGV2ZWxzRGVlcCAtIDEsIGNsb3NlZCkgOlxyXG5cdFx0XHRcdEwuR2VvSlNPTi5sYXRMbmdUb0Nvb3JkcyhsYXRsbmdzW2ldKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFsZXZlbHNEZWVwICYmIGNsb3NlZCkge1xyXG5cdFx0XHRjb29yZHMucHVzaChjb29yZHNbMF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjb29yZHM7XHJcblx0fSxcclxuXHJcblx0Z2V0RmVhdHVyZTogZnVuY3Rpb24gKGxheWVyLCBuZXdHZW9tZXRyeSkge1xyXG5cdFx0cmV0dXJuIGxheWVyLmZlYXR1cmUgP1xyXG5cdFx0XHRcdEwuZXh0ZW5kKHt9LCBsYXllci5mZWF0dXJlLCB7Z2VvbWV0cnk6IG5ld0dlb21ldHJ5fSkgOlxyXG5cdFx0XHRcdEwuR2VvSlNPTi5hc0ZlYXR1cmUobmV3R2VvbWV0cnkpO1xyXG5cdH0sXHJcblxyXG5cdGFzRmVhdHVyZTogZnVuY3Rpb24gKGdlb0pTT04pIHtcclxuXHRcdGlmIChnZW9KU09OLnR5cGUgPT09ICdGZWF0dXJlJykge1xyXG5cdFx0XHRyZXR1cm4gZ2VvSlNPTjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiAnRmVhdHVyZScsXHJcblx0XHRcdHByb3BlcnRpZXM6IHt9LFxyXG5cdFx0XHRnZW9tZXRyeTogZ2VvSlNPTlxyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxudmFyIFBvaW50VG9HZW9KU09OID0ge1xyXG5cdHRvR2VvSlNPTjogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIEwuR2VvSlNPTi5nZXRGZWF0dXJlKHRoaXMsIHtcclxuXHRcdFx0dHlwZTogJ1BvaW50JyxcclxuXHRcdFx0Y29vcmRpbmF0ZXM6IEwuR2VvSlNPTi5sYXRMbmdUb0Nvb3Jkcyh0aGlzLmdldExhdExuZygpKVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG5cclxuTC5NYXJrZXIuaW5jbHVkZShQb2ludFRvR2VvSlNPTik7XHJcbkwuQ2lyY2xlLmluY2x1ZGUoUG9pbnRUb0dlb0pTT04pO1xyXG5MLkNpcmNsZU1hcmtlci5pbmNsdWRlKFBvaW50VG9HZW9KU09OKTtcclxuXHJcbkwuUG9seWxpbmUucHJvdG90eXBlLnRvR2VvSlNPTiA9IGZ1bmN0aW9uICgpIHtcclxuXHR2YXIgbXVsdGkgPSAhTC5Qb2x5bGluZS5fZmxhdCh0aGlzLl9sYXRsbmdzKTtcclxuXHJcblx0dmFyIGNvb3JkcyA9IEwuR2VvSlNPTi5sYXRMbmdzVG9Db29yZHModGhpcy5fbGF0bG5ncywgbXVsdGkgPyAxIDogMCk7XHJcblxyXG5cdHJldHVybiBMLkdlb0pTT04uZ2V0RmVhdHVyZSh0aGlzLCB7XHJcblx0XHR0eXBlOiAobXVsdGkgPyAnTXVsdGknIDogJycpICsgJ0xpbmVTdHJpbmcnLFxyXG5cdFx0Y29vcmRpbmF0ZXM6IGNvb3Jkc1xyXG5cdH0pO1xyXG59O1xyXG5cclxuTC5Qb2x5Z29uLnByb3RvdHlwZS50b0dlb0pTT04gPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGhvbGVzID0gIUwuUG9seWxpbmUuX2ZsYXQodGhpcy5fbGF0bG5ncyksXHJcblx0ICAgIG11bHRpID0gaG9sZXMgJiYgIUwuUG9seWxpbmUuX2ZsYXQodGhpcy5fbGF0bG5nc1swXSk7XHJcblxyXG5cdHZhciBjb29yZHMgPSBMLkdlb0pTT04ubGF0TG5nc1RvQ29vcmRzKHRoaXMuX2xhdGxuZ3MsIG11bHRpID8gMiA6IGhvbGVzID8gMSA6IDAsIHRydWUpO1xyXG5cclxuXHRpZiAoIWhvbGVzKSB7XHJcblx0XHRjb29yZHMgPSBbY29vcmRzXTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBMLkdlb0pTT04uZ2V0RmVhdHVyZSh0aGlzLCB7XHJcblx0XHR0eXBlOiAobXVsdGkgPyAnTXVsdGknIDogJycpICsgJ1BvbHlnb24nLFxyXG5cdFx0Y29vcmRpbmF0ZXM6IGNvb3Jkc1xyXG5cdH0pO1xyXG59O1xyXG5cclxuXHJcbkwuTGF5ZXJHcm91cC5pbmNsdWRlKHtcclxuXHR0b011bHRpUG9pbnQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBjb29yZHMgPSBbXTtcclxuXHJcblx0XHR0aGlzLmVhY2hMYXllcihmdW5jdGlvbiAobGF5ZXIpIHtcclxuXHRcdFx0Y29vcmRzLnB1c2gobGF5ZXIudG9HZW9KU09OKCkuZ2VvbWV0cnkuY29vcmRpbmF0ZXMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIEwuR2VvSlNPTi5nZXRGZWF0dXJlKHRoaXMsIHtcclxuXHRcdFx0dHlwZTogJ011bHRpUG9pbnQnLFxyXG5cdFx0XHRjb29yZGluYXRlczogY29vcmRzXHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHR0b0dlb0pTT046IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHR2YXIgdHlwZSA9IHRoaXMuZmVhdHVyZSAmJiB0aGlzLmZlYXR1cmUuZ2VvbWV0cnkgJiYgdGhpcy5mZWF0dXJlLmdlb21ldHJ5LnR5cGU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdNdWx0aVBvaW50Jykge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy50b011bHRpUG9pbnQoKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaXNHZW9tZXRyeUNvbGxlY3Rpb24gPSB0eXBlID09PSAnR2VvbWV0cnlDb2xsZWN0aW9uJyxcclxuXHRcdCAgICBqc29ucyA9IFtdO1xyXG5cclxuXHRcdHRoaXMuZWFjaExheWVyKGZ1bmN0aW9uIChsYXllcikge1xyXG5cdFx0XHRpZiAobGF5ZXIudG9HZW9KU09OKSB7XHJcblx0XHRcdFx0dmFyIGpzb24gPSBsYXllci50b0dlb0pTT04oKTtcclxuXHRcdFx0XHRqc29ucy5wdXNoKGlzR2VvbWV0cnlDb2xsZWN0aW9uID8ganNvbi5nZW9tZXRyeSA6IEwuR2VvSlNPTi5hc0ZlYXR1cmUoanNvbikpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoaXNHZW9tZXRyeUNvbGxlY3Rpb24pIHtcclxuXHRcdFx0cmV0dXJuIEwuR2VvSlNPTi5nZXRGZWF0dXJlKHRoaXMsIHtcclxuXHRcdFx0XHRnZW9tZXRyaWVzOiBqc29ucyxcclxuXHRcdFx0XHR0eXBlOiAnR2VvbWV0cnlDb2xsZWN0aW9uJ1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiAnRmVhdHVyZUNvbGxlY3Rpb24nLFxyXG5cdFx0XHRmZWF0dXJlczoganNvbnNcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbkwuZ2VvSnNvbiA9IGZ1bmN0aW9uIChnZW9qc29uLCBvcHRpb25zKSB7XHJcblx0cmV0dXJuIG5ldyBMLkdlb0pTT04oZ2VvanNvbiwgb3B0aW9ucyk7XHJcbn07XHJcblxuXG5cbi8qXHJcbiAqIEwuRG9tRXZlbnQgY29udGFpbnMgZnVuY3Rpb25zIGZvciB3b3JraW5nIHdpdGggRE9NIGV2ZW50cy5cclxuICogSW5zcGlyZWQgYnkgSm9obiBSZXNpZywgRGVhbiBFZHdhcmRzIGFuZCBZVUkgYWRkRXZlbnQgaW1wbGVtZW50YXRpb25zLlxyXG4gKi9cclxuXHJcbnZhciBldmVudHNLZXkgPSAnX2xlYWZsZXRfZXZlbnRzJztcclxuXHJcbkwuRG9tRXZlbnQgPSB7XHJcblxyXG5cdG9uOiBmdW5jdGlvbiAob2JqLCB0eXBlcywgZm4sIGNvbnRleHQpIHtcclxuXHJcblx0XHRpZiAodHlwZW9mIHR5cGVzID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRmb3IgKHZhciB0eXBlIGluIHR5cGVzKSB7XHJcblx0XHRcdFx0dGhpcy5fb24ob2JqLCB0eXBlLCB0eXBlc1t0eXBlXSwgZm4pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0eXBlcyA9IEwuVXRpbC5zcGxpdFdvcmRzKHR5cGVzKTtcclxuXHJcblx0XHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSB0eXBlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHRcdHRoaXMuX29uKG9iaiwgdHlwZXNbaV0sIGZuLCBjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdG9mZjogZnVuY3Rpb24gKG9iaiwgdHlwZXMsIGZuLCBjb250ZXh0KSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiB0eXBlcyA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0Zm9yICh2YXIgdHlwZSBpbiB0eXBlcykge1xyXG5cdFx0XHRcdHRoaXMuX29mZihvYmosIHR5cGUsIHR5cGVzW3R5cGVdLCBmbik7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHR5cGVzID0gTC5VdGlsLnNwbGl0V29yZHModHlwZXMpO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHR5cGVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0dGhpcy5fb2ZmKG9iaiwgdHlwZXNbaV0sIGZuLCBjb250ZXh0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdF9vbjogZnVuY3Rpb24gKG9iaiwgdHlwZSwgZm4sIGNvbnRleHQpIHtcclxuXHRcdHZhciBpZCA9IHR5cGUgKyBMLnN0YW1wKGZuKSArIChjb250ZXh0ID8gJ18nICsgTC5zdGFtcChjb250ZXh0KSA6ICcnKTtcclxuXHJcblx0XHRpZiAob2JqW2V2ZW50c0tleV0gJiYgb2JqW2V2ZW50c0tleV1baWRdKSB7IHJldHVybiB0aGlzOyB9XHJcblxyXG5cdFx0dmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRyZXR1cm4gZm4uY2FsbChjb250ZXh0IHx8IG9iaiwgZSB8fCB3aW5kb3cuZXZlbnQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgb3JpZ2luYWxIYW5kbGVyID0gaGFuZGxlcjtcclxuXHJcblx0XHRpZiAoTC5Ccm93c2VyLnBvaW50ZXIgJiYgdHlwZS5pbmRleE9mKCd0b3VjaCcpID09PSAwKSB7XHJcblx0XHRcdHRoaXMuYWRkUG9pbnRlckxpc3RlbmVyKG9iaiwgdHlwZSwgaGFuZGxlciwgaWQpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAoTC5Ccm93c2VyLnRvdWNoICYmICh0eXBlID09PSAnZGJsY2xpY2snKSAmJiB0aGlzLmFkZERvdWJsZVRhcExpc3RlbmVyKSB7XHJcblx0XHRcdHRoaXMuYWRkRG91YmxlVGFwTGlzdGVuZXIob2JqLCBoYW5kbGVyLCBpZCk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICgnYWRkRXZlbnRMaXN0ZW5lcicgaW4gb2JqKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZSA9PT0gJ21vdXNld2hlZWwnKSB7XHJcblx0XHRcdFx0b2JqLmFkZEV2ZW50TGlzdGVuZXIoJ0RPTU1vdXNlU2Nyb2xsJywgaGFuZGxlciwgZmFsc2UpO1xyXG5cdFx0XHRcdG9iai5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuXHJcblx0XHRcdH0gZWxzZSBpZiAoKHR5cGUgPT09ICdtb3VzZWVudGVyJykgfHwgKHR5cGUgPT09ICdtb3VzZWxlYXZlJykpIHtcclxuXHRcdFx0XHRoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcclxuXHRcdFx0XHRcdGlmIChMLkRvbUV2ZW50Ll9pc0V4dGVybmFsVGFyZ2V0KG9iaiwgZSkpIHtcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxIYW5kbGVyKGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0b2JqLmFkZEV2ZW50TGlzdGVuZXIodHlwZSA9PT0gJ21vdXNlZW50ZXInID8gJ21vdXNlb3ZlcicgOiAnbW91c2VvdXQnLCBoYW5kbGVyLCBmYWxzZSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICh0eXBlID09PSAnY2xpY2snICYmIEwuQnJvd3Nlci5hbmRyb2lkKSB7XHJcblx0XHRcdFx0XHRoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIEwuRG9tRXZlbnQuX2ZpbHRlckNsaWNrKGUsIG9yaWdpbmFsSGFuZGxlcik7XHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRvYmouYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLCBmYWxzZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHR9IGVsc2UgaWYgKCdhdHRhY2hFdmVudCcgaW4gb2JqKSB7XHJcblx0XHRcdG9iai5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgaGFuZGxlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0b2JqW2V2ZW50c0tleV0gPSBvYmpbZXZlbnRzS2V5XSB8fCB7fTtcclxuXHRcdG9ialtldmVudHNLZXldW2lkXSA9IGhhbmRsZXI7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0X29mZjogZnVuY3Rpb24gKG9iaiwgdHlwZSwgZm4sIGNvbnRleHQpIHtcclxuXHJcblx0XHR2YXIgaWQgPSB0eXBlICsgTC5zdGFtcChmbikgKyAoY29udGV4dCA/ICdfJyArIEwuc3RhbXAoY29udGV4dCkgOiAnJyksXHJcblx0XHQgICAgaGFuZGxlciA9IG9ialtldmVudHNLZXldICYmIG9ialtldmVudHNLZXldW2lkXTtcclxuXHJcblx0XHRpZiAoIWhhbmRsZXIpIHsgcmV0dXJuIHRoaXM7IH1cclxuXHJcblx0XHRpZiAoTC5Ccm93c2VyLnBvaW50ZXIgJiYgdHlwZS5pbmRleE9mKCd0b3VjaCcpID09PSAwKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlUG9pbnRlckxpc3RlbmVyKG9iaiwgdHlwZSwgaWQpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAoTC5Ccm93c2VyLnRvdWNoICYmICh0eXBlID09PSAnZGJsY2xpY2snKSAmJiB0aGlzLnJlbW92ZURvdWJsZVRhcExpc3RlbmVyKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlRG91YmxlVGFwTGlzdGVuZXIob2JqLCBpZCk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICgncmVtb3ZlRXZlbnRMaXN0ZW5lcicgaW4gb2JqKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZSA9PT0gJ21vdXNld2hlZWwnKSB7XHJcblx0XHRcdFx0b2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTU1vdXNlU2Nyb2xsJywgaGFuZGxlciwgZmFsc2UpO1xyXG5cdFx0XHRcdG9iai5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0b2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XHR0eXBlID09PSAnbW91c2VlbnRlcicgPyAnbW91c2VvdmVyJyA6XHJcblx0XHRcdFx0XHR0eXBlID09PSAnbW91c2VsZWF2ZScgPyAnbW91c2VvdXQnIDogdHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0fSBlbHNlIGlmICgnZGV0YWNoRXZlbnQnIGluIG9iaikge1xyXG5cdFx0XHRvYmouZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdG9ialtldmVudHNLZXldW2lkXSA9IG51bGw7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c3RvcFByb3BhZ2F0aW9uOiBmdW5jdGlvbiAoZSkge1xyXG5cclxuXHRcdGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0fSBlbHNlIGlmIChlLm9yaWdpbmFsRXZlbnQpIHsgIC8vIEluIGNhc2Ugb2YgTGVhZmxldCBldmVudC5cclxuXHRcdFx0ZS5vcmlnaW5hbEV2ZW50Ll9zdG9wcGVkID0gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdEwuRG9tRXZlbnQuX3NraXBwZWQoZSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0ZGlzYWJsZVNjcm9sbFByb3BhZ2F0aW9uOiBmdW5jdGlvbiAoZWwpIHtcclxuXHRcdHJldHVybiBMLkRvbUV2ZW50Lm9uKGVsLCAnbW91c2V3aGVlbCBNb3pNb3VzZVBpeGVsU2Nyb2xsJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pO1xyXG5cdH0sXHJcblxyXG5cdGRpc2FibGVDbGlja1Byb3BhZ2F0aW9uOiBmdW5jdGlvbiAoZWwpIHtcclxuXHRcdHZhciBzdG9wID0gTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb247XHJcblxyXG5cdFx0TC5Eb21FdmVudC5vbihlbCwgTC5EcmFnZ2FibGUuU1RBUlQuam9pbignICcpLCBzdG9wKTtcclxuXHJcblx0XHRyZXR1cm4gTC5Eb21FdmVudC5vbihlbCwge1xyXG5cdFx0XHRjbGljazogTC5Eb21FdmVudC5fZmFrZVN0b3AsXHJcblx0XHRcdGRibGNsaWNrOiBzdG9wXHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24gKGUpIHtcclxuXHJcblx0XHRpZiAoZS5wcmV2ZW50RGVmYXVsdCkge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRzdG9wOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0cmV0dXJuIEwuRG9tRXZlbnRcclxuXHRcdFx0LnByZXZlbnREZWZhdWx0KGUpXHJcblx0XHRcdC5zdG9wUHJvcGFnYXRpb24oZSk7XHJcblx0fSxcclxuXHJcblx0Z2V0TW91c2VQb3NpdGlvbjogZnVuY3Rpb24gKGUsIGNvbnRhaW5lcikge1xyXG5cdFx0aWYgKCFjb250YWluZXIpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBMLlBvaW50KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgcmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcblx0XHRyZXR1cm4gbmV3IEwuUG9pbnQoXHJcblx0XHRcdGUuY2xpZW50WCAtIHJlY3QubGVmdCAtIGNvbnRhaW5lci5jbGllbnRMZWZ0LFxyXG5cdFx0XHRlLmNsaWVudFkgLSByZWN0LnRvcCAtIGNvbnRhaW5lci5jbGllbnRUb3ApO1xyXG5cdH0sXHJcblxyXG5cdGdldFdoZWVsRGVsdGE6IGZ1bmN0aW9uIChlKSB7XHJcblxyXG5cdFx0dmFyIGRlbHRhID0gMDtcclxuXHJcblx0XHRpZiAoZS53aGVlbERlbHRhKSB7XHJcblx0XHRcdGRlbHRhID0gZS53aGVlbERlbHRhIC8gMTIwO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGUuZGV0YWlsKSB7XHJcblx0XHRcdGRlbHRhID0gLWUuZGV0YWlsIC8gMztcclxuXHRcdH1cclxuXHRcdHJldHVybiBkZWx0YTtcclxuXHR9LFxyXG5cclxuXHRfc2tpcEV2ZW50czoge30sXHJcblxyXG5cdF9mYWtlU3RvcDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdC8vIGZha2VzIHN0b3BQcm9wYWdhdGlvbiBieSBzZXR0aW5nIGEgc3BlY2lhbCBldmVudCBmbGFnLCBjaGVja2VkL3Jlc2V0IHdpdGggTC5Eb21FdmVudC5fc2tpcHBlZChlKVxyXG5cdFx0TC5Eb21FdmVudC5fc2tpcEV2ZW50c1tlLnR5cGVdID0gdHJ1ZTtcclxuXHR9LFxyXG5cclxuXHRfc2tpcHBlZDogZnVuY3Rpb24gKGUpIHtcclxuXHRcdHZhciBza2lwcGVkID0gdGhpcy5fc2tpcEV2ZW50c1tlLnR5cGVdO1xyXG5cdFx0Ly8gcmVzZXQgd2hlbiBjaGVja2luZywgYXMgaXQncyBvbmx5IHVzZWQgaW4gbWFwIGNvbnRhaW5lciBhbmQgcHJvcGFnYXRlcyBvdXRzaWRlIG9mIHRoZSBtYXBcclxuXHRcdHRoaXMuX3NraXBFdmVudHNbZS50eXBlXSA9IGZhbHNlO1xyXG5cdFx0cmV0dXJuIHNraXBwZWQ7XHJcblx0fSxcclxuXHJcblx0Ly8gY2hlY2sgaWYgZWxlbWVudCByZWFsbHkgbGVmdC9lbnRlcmVkIHRoZSBldmVudCB0YXJnZXQgKGZvciBtb3VzZWVudGVyL21vdXNlbGVhdmUpXHJcblx0X2lzRXh0ZXJuYWxUYXJnZXQ6IGZ1bmN0aW9uIChlbCwgZSkge1xyXG5cclxuXHRcdHZhciByZWxhdGVkID0gZS5yZWxhdGVkVGFyZ2V0O1xyXG5cclxuXHRcdGlmICghcmVsYXRlZCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHdoaWxlIChyZWxhdGVkICYmIChyZWxhdGVkICE9PSBlbCkpIHtcclxuXHRcdFx0XHRyZWxhdGVkID0gcmVsYXRlZC5wYXJlbnROb2RlO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIChyZWxhdGVkICE9PSBlbCk7XHJcblx0fSxcclxuXHJcblx0Ly8gdGhpcyBpcyBhIGhvcnJpYmxlIHdvcmthcm91bmQgZm9yIGEgYnVnIGluIEFuZHJvaWQgd2hlcmUgYSBzaW5nbGUgdG91Y2ggdHJpZ2dlcnMgdHdvIGNsaWNrIGV2ZW50c1xyXG5cdF9maWx0ZXJDbGljazogZnVuY3Rpb24gKGUsIGhhbmRsZXIpIHtcclxuXHRcdHZhciB0aW1lU3RhbXAgPSAoZS50aW1lU3RhbXAgfHwgZS5vcmlnaW5hbEV2ZW50LnRpbWVTdGFtcCksXHJcblx0XHQgICAgZWxhcHNlZCA9IEwuRG9tRXZlbnQuX2xhc3RDbGljayAmJiAodGltZVN0YW1wIC0gTC5Eb21FdmVudC5fbGFzdENsaWNrKTtcclxuXHJcblx0XHQvLyBhcmUgdGhleSBjbG9zZXIgdG9nZXRoZXIgdGhhbiA1MDBtcyB5ZXQgbW9yZSB0aGFuIDEwMG1zP1xyXG5cdFx0Ly8gQW5kcm9pZCB0eXBpY2FsbHkgdHJpZ2dlcnMgdGhlbSB+MzAwbXMgYXBhcnQgd2hpbGUgbXVsdGlwbGUgbGlzdGVuZXJzXHJcblx0XHQvLyBvbiB0aGUgc2FtZSBldmVudCBzaG91bGQgYmUgdHJpZ2dlcmVkIGZhciBmYXN0ZXI7XHJcblx0XHQvLyBvciBjaGVjayBpZiBjbGljayBpcyBzaW11bGF0ZWQgb24gdGhlIGVsZW1lbnQsIGFuZCBpZiBpdCBpcywgcmVqZWN0IGFueSBub24tc2ltdWxhdGVkIGV2ZW50c1xyXG5cclxuXHRcdGlmICgoZWxhcHNlZCAmJiBlbGFwc2VkID4gMTAwICYmIGVsYXBzZWQgPCA1MDApIHx8IChlLnRhcmdldC5fc2ltdWxhdGVkQ2xpY2sgJiYgIWUuX3NpbXVsYXRlZCkpIHtcclxuXHRcdFx0TC5Eb21FdmVudC5zdG9wKGUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRMLkRvbUV2ZW50Ll9sYXN0Q2xpY2sgPSB0aW1lU3RhbXA7XHJcblxyXG5cdFx0aGFuZGxlcihlKTtcclxuXHR9XHJcbn07XHJcblxyXG5MLkRvbUV2ZW50LmFkZExpc3RlbmVyID0gTC5Eb21FdmVudC5vbjtcclxuTC5Eb21FdmVudC5yZW1vdmVMaXN0ZW5lciA9IEwuRG9tRXZlbnQub2ZmO1xyXG5cblxuXG4vKlxyXG4gKiBMLkRyYWdnYWJsZSBhbGxvd3MgeW91IHRvIGFkZCBkcmFnZ2luZyBjYXBhYmlsaXRpZXMgdG8gYW55IGVsZW1lbnQuIFN1cHBvcnRzIG1vYmlsZSBkZXZpY2VzIHRvby5cclxuICovXHJcblxyXG5MLkRyYWdnYWJsZSA9IEwuRXZlbnRlZC5leHRlbmQoe1xyXG5cclxuXHRzdGF0aWNzOiB7XHJcblx0XHRTVEFSVDogTC5Ccm93c2VyLnRvdWNoID8gWyd0b3VjaHN0YXJ0JywgJ21vdXNlZG93biddIDogWydtb3VzZWRvd24nXSxcclxuXHRcdEVORDoge1xyXG5cdFx0XHRtb3VzZWRvd246ICdtb3VzZXVwJyxcclxuXHRcdFx0dG91Y2hzdGFydDogJ3RvdWNoZW5kJyxcclxuXHRcdFx0cG9pbnRlcmRvd246ICd0b3VjaGVuZCcsXHJcblx0XHRcdE1TUG9pbnRlckRvd246ICd0b3VjaGVuZCdcclxuXHRcdH0sXHJcblx0XHRNT1ZFOiB7XHJcblx0XHRcdG1vdXNlZG93bjogJ21vdXNlbW92ZScsXHJcblx0XHRcdHRvdWNoc3RhcnQ6ICd0b3VjaG1vdmUnLFxyXG5cdFx0XHRwb2ludGVyZG93bjogJ3RvdWNobW92ZScsXHJcblx0XHRcdE1TUG9pbnRlckRvd246ICd0b3VjaG1vdmUnXHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24gKGVsZW1lbnQsIGRyYWdTdGFydFRhcmdldCwgcHJldmVudE91dGxpbmUpIHtcclxuXHRcdHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xyXG5cdFx0dGhpcy5fZHJhZ1N0YXJ0VGFyZ2V0ID0gZHJhZ1N0YXJ0VGFyZ2V0IHx8IGVsZW1lbnQ7XHJcblx0XHR0aGlzLl9wcmV2ZW50T3V0bGluZSA9IHByZXZlbnRPdXRsaW5lO1xyXG5cdH0sXHJcblxyXG5cdGVuYWJsZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKHRoaXMuX2VuYWJsZWQpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0TC5Eb21FdmVudC5vbih0aGlzLl9kcmFnU3RhcnRUYXJnZXQsIEwuRHJhZ2dhYmxlLlNUQVJULmpvaW4oJyAnKSwgdGhpcy5fb25Eb3duLCB0aGlzKTtcclxuXHJcblx0XHR0aGlzLl9lbmFibGVkID0gdHJ1ZTtcclxuXHR9LFxyXG5cclxuXHRkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAoIXRoaXMuX2VuYWJsZWQpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0TC5Eb21FdmVudC5vZmYodGhpcy5fZHJhZ1N0YXJ0VGFyZ2V0LCBMLkRyYWdnYWJsZS5TVEFSVC5qb2luKCcgJyksIHRoaXMuX29uRG93biwgdGhpcyk7XHJcblxyXG5cdFx0dGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5fbW92ZWQgPSBmYWxzZTtcclxuXHR9LFxyXG5cclxuXHRfb25Eb3duOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0dGhpcy5fbW92ZWQgPSBmYWxzZTtcclxuXHJcblx0XHRpZiAoTC5Eb21VdGlsLmhhc0NsYXNzKHRoaXMuX2VsZW1lbnQsICdsZWFmbGV0LXpvb20tYW5pbScpKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdGlmIChMLkRyYWdnYWJsZS5fZHJhZ2dpbmcgfHwgZS5zaGlmdEtleSB8fCAoKGUud2hpY2ggIT09IDEpICYmIChlLmJ1dHRvbiAhPT0gMSkgJiYgIWUudG91Y2hlcykgfHwgIXRoaXMuX2VuYWJsZWQpIHsgcmV0dXJuOyB9XHJcblx0XHRMLkRyYWdnYWJsZS5fZHJhZ2dpbmcgPSB0cnVlOyAgLy8gUHJldmVudCBkcmFnZ2luZyBtdWx0aXBsZSBvYmplY3RzIGF0IG9uY2UuXHJcblxyXG5cdFx0aWYgKHRoaXMuX3ByZXZlbnRPdXRsaW5lKSB7XHJcblx0XHRcdEwuRG9tVXRpbC5wcmV2ZW50T3V0bGluZSh0aGlzLl9lbGVtZW50KTtcclxuXHRcdH1cclxuXHJcblx0XHRMLkRvbVV0aWwuZGlzYWJsZUltYWdlRHJhZygpO1xyXG5cdFx0TC5Eb21VdGlsLmRpc2FibGVUZXh0U2VsZWN0aW9uKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuX21vdmluZykgeyByZXR1cm47IH1cclxuXHJcblx0XHR0aGlzLmZpcmUoJ2Rvd24nKTtcclxuXHJcblx0XHR2YXIgZmlyc3QgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0gOiBlO1xyXG5cclxuXHRcdHRoaXMuX3N0YXJ0UG9pbnQgPSBuZXcgTC5Qb2ludChmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZKTtcclxuXHRcdHRoaXMuX3N0YXJ0UG9zID0gdGhpcy5fbmV3UG9zID0gTC5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2VsZW1lbnQpO1xyXG5cclxuXHRcdEwuRG9tRXZlbnRcclxuXHRcdCAgICAub24oZG9jdW1lbnQsIEwuRHJhZ2dhYmxlLk1PVkVbZS50eXBlXSwgdGhpcy5fb25Nb3ZlLCB0aGlzKVxyXG5cdFx0ICAgIC5vbihkb2N1bWVudCwgTC5EcmFnZ2FibGUuRU5EW2UudHlwZV0sIHRoaXMuX29uVXAsIHRoaXMpO1xyXG5cdH0sXHJcblxyXG5cdF9vbk1vdmU6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdHRoaXMuX21vdmVkID0gdHJ1ZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBmaXJzdCA9IChlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCA9PT0gMSA/IGUudG91Y2hlc1swXSA6IGUpLFxyXG5cdFx0ICAgIG5ld1BvaW50ID0gbmV3IEwuUG9pbnQoZmlyc3QuY2xpZW50WCwgZmlyc3QuY2xpZW50WSksXHJcblx0XHQgICAgb2Zmc2V0ID0gbmV3UG9pbnQuc3VidHJhY3QodGhpcy5fc3RhcnRQb2ludCk7XHJcblxyXG5cdFx0aWYgKCFvZmZzZXQueCAmJiAhb2Zmc2V0LnkpIHsgcmV0dXJuOyB9XHJcblx0XHRpZiAoTC5Ccm93c2VyLnRvdWNoICYmIE1hdGguYWJzKG9mZnNldC54KSArIE1hdGguYWJzKG9mZnNldC55KSA8IDMpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcclxuXHJcblx0XHRpZiAoIXRoaXMuX21vdmVkKSB7XHJcblx0XHRcdHRoaXMuZmlyZSgnZHJhZ3N0YXJ0Jyk7XHJcblxyXG5cdFx0XHR0aGlzLl9tb3ZlZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuX3N0YXJ0UG9zID0gTC5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2VsZW1lbnQpLnN1YnRyYWN0KG9mZnNldCk7XHJcblxyXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2xlYWZsZXQtZHJhZ2dpbmcnKTtcclxuXHJcblx0XHRcdHRoaXMuX2xhc3RUYXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XHJcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9sYXN0VGFyZ2V0LCAnbGVhZmxldC1kcmFnLXRhcmdldCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX25ld1BvcyA9IHRoaXMuX3N0YXJ0UG9zLmFkZChvZmZzZXQpO1xyXG5cdFx0dGhpcy5fbW92aW5nID0gdHJ1ZTtcclxuXHJcblx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1SZXF1ZXN0KTtcclxuXHRcdHRoaXMuX2xhc3RFdmVudCA9IGU7XHJcblx0XHR0aGlzLl9hbmltUmVxdWVzdCA9IEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKHRoaXMuX3VwZGF0ZVBvc2l0aW9uLCB0aGlzLCB0cnVlKTtcclxuXHR9LFxyXG5cclxuXHRfdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBlID0ge29yaWdpbmFsRXZlbnQ6IHRoaXMuX2xhc3RFdmVudH07XHJcblx0XHR0aGlzLmZpcmUoJ3ByZWRyYWcnLCBlKTtcclxuXHRcdEwuRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9lbGVtZW50LCB0aGlzLl9uZXdQb3MpO1xyXG5cdFx0dGhpcy5maXJlKCdkcmFnJywgZSk7XHJcblx0fSxcclxuXHJcblx0X29uVXA6IGZ1bmN0aW9uICgpIHtcclxuXHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyhkb2N1bWVudC5ib2R5LCAnbGVhZmxldC1kcmFnZ2luZycpO1xyXG5cclxuXHRcdGlmICh0aGlzLl9sYXN0VGFyZ2V0KSB7XHJcblx0XHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl9sYXN0VGFyZ2V0LCAnbGVhZmxldC1kcmFnLXRhcmdldCcpO1xyXG5cdFx0XHR0aGlzLl9sYXN0VGFyZ2V0ID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKHZhciBpIGluIEwuRHJhZ2dhYmxlLk1PVkUpIHtcclxuXHRcdFx0TC5Eb21FdmVudFxyXG5cdFx0XHQgICAgLm9mZihkb2N1bWVudCwgTC5EcmFnZ2FibGUuTU9WRVtpXSwgdGhpcy5fb25Nb3ZlLCB0aGlzKVxyXG5cdFx0XHQgICAgLm9mZihkb2N1bWVudCwgTC5EcmFnZ2FibGUuRU5EW2ldLCB0aGlzLl9vblVwLCB0aGlzKTtcclxuXHRcdH1cclxuXHJcblx0XHRMLkRvbVV0aWwuZW5hYmxlSW1hZ2VEcmFnKCk7XHJcblx0XHRMLkRvbVV0aWwuZW5hYmxlVGV4dFNlbGVjdGlvbigpO1xyXG5cclxuXHRcdGlmICh0aGlzLl9tb3ZlZCAmJiB0aGlzLl9tb3ZpbmcpIHtcclxuXHRcdFx0Ly8gZW5zdXJlIGRyYWcgaXMgbm90IGZpcmVkIGFmdGVyIGRyYWdlbmRcclxuXHRcdFx0TC5VdGlsLmNhbmNlbEFuaW1GcmFtZSh0aGlzLl9hbmltUmVxdWVzdCk7XHJcblxyXG5cdFx0XHR0aGlzLmZpcmUoJ2RyYWdlbmQnLCB7XHJcblx0XHRcdFx0ZGlzdGFuY2U6IHRoaXMuX25ld1Bvcy5kaXN0YW5jZVRvKHRoaXMuX3N0YXJ0UG9zKVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9tb3ZpbmcgPSBmYWxzZTtcclxuXHRcdEwuRHJhZ2dhYmxlLl9kcmFnZ2luZyA9IGZhbHNlO1xyXG5cdH1cclxufSk7XHJcblxuXG5cbi8qXG5cdEwuSGFuZGxlciBpcyBhIGJhc2UgY2xhc3MgZm9yIGhhbmRsZXIgY2xhc3NlcyB0aGF0IGFyZSB1c2VkIGludGVybmFsbHkgdG8gaW5qZWN0XG5cdGludGVyYWN0aW9uIGZlYXR1cmVzIGxpa2UgZHJhZ2dpbmcgdG8gY2xhc3NlcyBsaWtlIE1hcCBhbmQgTWFya2VyLlxuKi9cblxuTC5IYW5kbGVyID0gTC5DbGFzcy5leHRlbmQoe1xuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwKSB7XG5cdFx0dGhpcy5fbWFwID0gbWFwO1xuXHR9LFxuXG5cdGVuYWJsZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9lbmFibGVkKSB7IHJldHVybjsgfVxuXG5cdFx0dGhpcy5fZW5hYmxlZCA9IHRydWU7XG5cdFx0dGhpcy5hZGRIb29rcygpO1xuXHR9LFxuXG5cdGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuX2VuYWJsZWQpIHsgcmV0dXJuOyB9XG5cblx0XHR0aGlzLl9lbmFibGVkID0gZmFsc2U7XG5cdFx0dGhpcy5yZW1vdmVIb29rcygpO1xuXHR9LFxuXG5cdGVuYWJsZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gISF0aGlzLl9lbmFibGVkO1xuXHR9XG59KTtcblxuXG5cbi8qXG4gKiBMLkhhbmRsZXIuTWFwRHJhZyBpcyB1c2VkIHRvIG1ha2UgdGhlIG1hcCBkcmFnZ2FibGUgKHdpdGggcGFubmluZyBpbmVydGlhKSwgZW5hYmxlZCBieSBkZWZhdWx0LlxuICovXG5cbkwuTWFwLm1lcmdlT3B0aW9ucyh7XG5cdGRyYWdnaW5nOiB0cnVlLFxuXG5cdGluZXJ0aWE6ICFMLkJyb3dzZXIuYW5kcm9pZDIzLFxuXHRpbmVydGlhRGVjZWxlcmF0aW9uOiAzNDAwLCAvLyBweC9zXjJcblx0aW5lcnRpYU1heFNwZWVkOiBJbmZpbml0eSwgLy8gcHgvc1xuXHRlYXNlTGluZWFyaXR5OiAwLjIsXG5cblx0Ly8gVE9ETyByZWZhY3RvciwgbW92ZSB0byBDUlNcblx0d29ybGRDb3B5SnVtcDogZmFsc2Vcbn0pO1xuXG5MLk1hcC5EcmFnID0gTC5IYW5kbGVyLmV4dGVuZCh7XG5cdGFkZEhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9kcmFnZ2FibGUpIHtcblx0XHRcdHZhciBtYXAgPSB0aGlzLl9tYXA7XG5cblx0XHRcdHRoaXMuX2RyYWdnYWJsZSA9IG5ldyBMLkRyYWdnYWJsZShtYXAuX21hcFBhbmUsIG1hcC5fY29udGFpbmVyKTtcblxuXHRcdFx0dGhpcy5fZHJhZ2dhYmxlLm9uKHtcblx0XHRcdFx0ZG93bjogdGhpcy5fb25Eb3duLFxuXHRcdFx0XHRkcmFnc3RhcnQ6IHRoaXMuX29uRHJhZ1N0YXJ0LFxuXHRcdFx0XHRkcmFnOiB0aGlzLl9vbkRyYWcsXG5cdFx0XHRcdGRyYWdlbmQ6IHRoaXMuX29uRHJhZ0VuZFxuXHRcdFx0fSwgdGhpcyk7XG5cblx0XHRcdHRoaXMuX2RyYWdnYWJsZS5vbigncHJlZHJhZycsIHRoaXMuX29uUHJlRHJhZ0xpbWl0LCB0aGlzKTtcblx0XHRcdGlmIChtYXAub3B0aW9ucy53b3JsZENvcHlKdW1wKSB7XG5cdFx0XHRcdHRoaXMuX2RyYWdnYWJsZS5vbigncHJlZHJhZycsIHRoaXMuX29uUHJlRHJhZ1dyYXAsIHRoaXMpO1xuXHRcdFx0XHRtYXAub24oJ3pvb21lbmQnLCB0aGlzLl9vblpvb21FbmQsIHRoaXMpO1xuXG5cdFx0XHRcdG1hcC53aGVuUmVhZHkodGhpcy5fb25ab29tRW5kLCB0aGlzKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0TC5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX21hcC5fY29udGFpbmVyLCAnbGVhZmxldC1ncmFiJyk7XG5cdFx0dGhpcy5fZHJhZ2dhYmxlLmVuYWJsZSgpO1xuXHR9LFxuXG5cdHJlbW92ZUhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKHRoaXMuX21hcC5fY29udGFpbmVyLCAnbGVhZmxldC1ncmFiJyk7XG5cdFx0dGhpcy5fZHJhZ2dhYmxlLmRpc2FibGUoKTtcblx0fSxcblxuXHRtb3ZlZDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9kcmFnZ2FibGUgJiYgdGhpcy5fZHJhZ2dhYmxlLl9tb3ZlZDtcblx0fSxcblxuXHRfb25Eb3duOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fbWFwLnN0b3AoKTtcblx0fSxcblxuXHRfb25EcmFnU3RhcnQ6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwO1xuXG5cdFx0aWYgKHRoaXMuX21hcC5vcHRpb25zLm1heEJvdW5kcyAmJiB0aGlzLl9tYXAub3B0aW9ucy5tYXhCb3VuZHNWaXNjb3NpdHkpIHtcblx0XHRcdHZhciBib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyh0aGlzLl9tYXAub3B0aW9ucy5tYXhCb3VuZHMpO1xuXG5cdFx0XHR0aGlzLl9vZmZzZXRMaW1pdCA9IEwuYm91bmRzKFxuXHRcdFx0XHR0aGlzLl9tYXAubGF0TG5nVG9Db250YWluZXJQb2ludChib3VuZHMuZ2V0Tm9ydGhXZXN0KCkpLm11bHRpcGx5QnkoLTEpLFxuXHRcdFx0XHR0aGlzLl9tYXAubGF0TG5nVG9Db250YWluZXJQb2ludChib3VuZHMuZ2V0U291dGhFYXN0KCkpLm11bHRpcGx5QnkoLTEpXG5cdFx0XHRcdFx0LmFkZCh0aGlzLl9tYXAuZ2V0U2l6ZSgpKSk7XG5cblx0XHRcdHRoaXMuX3Zpc2Nvc2l0eSA9IE1hdGgubWluKDEuMCwgTWF0aC5tYXgoMC4wLCB0aGlzLl9tYXAub3B0aW9ucy5tYXhCb3VuZHNWaXNjb3NpdHkpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fb2Zmc2V0TGltaXQgPSBudWxsO1xuXHRcdH1cblxuXHRcdG1hcFxuXHRcdCAgICAuZmlyZSgnbW92ZXN0YXJ0Jylcblx0XHQgICAgLmZpcmUoJ2RyYWdzdGFydCcpO1xuXG5cdFx0aWYgKG1hcC5vcHRpb25zLmluZXJ0aWEpIHtcblx0XHRcdHRoaXMuX3Bvc2l0aW9ucyA9IFtdO1xuXHRcdFx0dGhpcy5fdGltZXMgPSBbXTtcblx0XHR9XG5cdH0sXG5cblx0X29uRHJhZzogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAodGhpcy5fbWFwLm9wdGlvbnMuaW5lcnRpYSkge1xuXHRcdFx0dmFyIHRpbWUgPSB0aGlzLl9sYXN0VGltZSA9ICtuZXcgRGF0ZSgpLFxuXHRcdFx0ICAgIHBvcyA9IHRoaXMuX2xhc3RQb3MgPSB0aGlzLl9kcmFnZ2FibGUuX2Fic1BvcyB8fCB0aGlzLl9kcmFnZ2FibGUuX25ld1BvcztcblxuXHRcdFx0dGhpcy5fcG9zaXRpb25zLnB1c2gocG9zKTtcblx0XHRcdHRoaXMuX3RpbWVzLnB1c2godGltZSk7XG5cblx0XHRcdGlmICh0aW1lIC0gdGhpcy5fdGltZXNbMF0gPiA1MCkge1xuXHRcdFx0XHR0aGlzLl9wb3NpdGlvbnMuc2hpZnQoKTtcblx0XHRcdFx0dGhpcy5fdGltZXMuc2hpZnQoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9tYXBcblx0XHQgICAgLmZpcmUoJ21vdmUnLCBlKVxuXHRcdCAgICAuZmlyZSgnZHJhZycsIGUpO1xuXHR9LFxuXG5cdF9vblpvb21FbmQ6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgcHhDZW50ZXIgPSB0aGlzLl9tYXAuZ2V0U2l6ZSgpLmRpdmlkZUJ5KDIpLFxuXHRcdCAgICBweFdvcmxkQ2VudGVyID0gdGhpcy5fbWFwLmxhdExuZ1RvTGF5ZXJQb2ludChbMCwgMF0pO1xuXG5cdFx0dGhpcy5faW5pdGlhbFdvcmxkT2Zmc2V0ID0gcHhXb3JsZENlbnRlci5zdWJ0cmFjdChweENlbnRlcikueDtcblx0XHR0aGlzLl93b3JsZFdpZHRoID0gdGhpcy5fbWFwLmdldFBpeGVsV29ybGRCb3VuZHMoKS5nZXRTaXplKCkueDtcblx0fSxcblxuXHRfdmlzY291c0xpbWl0OiBmdW5jdGlvbiAodmFsdWUsIHRocmVzaG9sZCkge1xuXHRcdHJldHVybiB2YWx1ZSAtICh2YWx1ZSAtIHRocmVzaG9sZCkgKiB0aGlzLl92aXNjb3NpdHk7XG5cdH0sXG5cblx0X29uUHJlRHJhZ0xpbWl0OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl92aXNjb3NpdHkgfHwgIXRoaXMuX29mZnNldExpbWl0KSB7IHJldHVybjsgfVxuXG5cdFx0dmFyIG9mZnNldCA9IHRoaXMuX2RyYWdnYWJsZS5fbmV3UG9zLnN1YnRyYWN0KHRoaXMuX2RyYWdnYWJsZS5fc3RhcnRQb3MpO1xuXG5cdFx0dmFyIGxpbWl0ID0gdGhpcy5fb2Zmc2V0TGltaXQ7XG5cdFx0aWYgKG9mZnNldC54IDwgbGltaXQubWluLngpIHsgb2Zmc2V0LnggPSB0aGlzLl92aXNjb3VzTGltaXQob2Zmc2V0LngsIGxpbWl0Lm1pbi54KTsgfVxuXHRcdGlmIChvZmZzZXQueSA8IGxpbWl0Lm1pbi55KSB7IG9mZnNldC55ID0gdGhpcy5fdmlzY291c0xpbWl0KG9mZnNldC55LCBsaW1pdC5taW4ueSk7IH1cblx0XHRpZiAob2Zmc2V0LnggPiBsaW1pdC5tYXgueCkgeyBvZmZzZXQueCA9IHRoaXMuX3Zpc2NvdXNMaW1pdChvZmZzZXQueCwgbGltaXQubWF4LngpOyB9XG5cdFx0aWYgKG9mZnNldC55ID4gbGltaXQubWF4LnkpIHsgb2Zmc2V0LnkgPSB0aGlzLl92aXNjb3VzTGltaXQob2Zmc2V0LnksIGxpbWl0Lm1heC55KTsgfVxuXG5cdFx0dGhpcy5fZHJhZ2dhYmxlLl9uZXdQb3MgPSB0aGlzLl9kcmFnZ2FibGUuX3N0YXJ0UG9zLmFkZChvZmZzZXQpO1xuXHR9LFxuXG5cdF9vblByZURyYWdXcmFwOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gVE9ETyByZWZhY3RvciB0byBiZSBhYmxlIHRvIGFkanVzdCBtYXAgcGFuZSBwb3NpdGlvbiBhZnRlciB6b29tXG5cdFx0dmFyIHdvcmxkV2lkdGggPSB0aGlzLl93b3JsZFdpZHRoLFxuXHRcdCAgICBoYWxmV2lkdGggPSBNYXRoLnJvdW5kKHdvcmxkV2lkdGggLyAyKSxcblx0XHQgICAgZHggPSB0aGlzLl9pbml0aWFsV29ybGRPZmZzZXQsXG5cdFx0ICAgIHggPSB0aGlzLl9kcmFnZ2FibGUuX25ld1Bvcy54LFxuXHRcdCAgICBuZXdYMSA9ICh4IC0gaGFsZldpZHRoICsgZHgpICUgd29ybGRXaWR0aCArIGhhbGZXaWR0aCAtIGR4LFxuXHRcdCAgICBuZXdYMiA9ICh4ICsgaGFsZldpZHRoICsgZHgpICUgd29ybGRXaWR0aCAtIGhhbGZXaWR0aCAtIGR4LFxuXHRcdCAgICBuZXdYID0gTWF0aC5hYnMobmV3WDEgKyBkeCkgPCBNYXRoLmFicyhuZXdYMiArIGR4KSA/IG5ld1gxIDogbmV3WDI7XG5cblx0XHR0aGlzLl9kcmFnZ2FibGUuX2Fic1BvcyA9IHRoaXMuX2RyYWdnYWJsZS5fbmV3UG9zLmNsb25lKCk7XG5cdFx0dGhpcy5fZHJhZ2dhYmxlLl9uZXdQb3MueCA9IG5ld1g7XG5cdH0sXG5cblx0X29uRHJhZ0VuZDogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwLFxuXHRcdCAgICBvcHRpb25zID0gbWFwLm9wdGlvbnMsXG5cblx0XHQgICAgbm9JbmVydGlhID0gIW9wdGlvbnMuaW5lcnRpYSB8fCB0aGlzLl90aW1lcy5sZW5ndGggPCAyO1xuXG5cdFx0bWFwLmZpcmUoJ2RyYWdlbmQnLCBlKTtcblxuXHRcdGlmIChub0luZXJ0aWEpIHtcblx0XHRcdG1hcC5maXJlKCdtb3ZlZW5kJyk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHR2YXIgZGlyZWN0aW9uID0gdGhpcy5fbGFzdFBvcy5zdWJ0cmFjdCh0aGlzLl9wb3NpdGlvbnNbMF0pLFxuXHRcdFx0ICAgIGR1cmF0aW9uID0gKHRoaXMuX2xhc3RUaW1lIC0gdGhpcy5fdGltZXNbMF0pIC8gMTAwMCxcblx0XHRcdCAgICBlYXNlID0gb3B0aW9ucy5lYXNlTGluZWFyaXR5LFxuXG5cdFx0XHQgICAgc3BlZWRWZWN0b3IgPSBkaXJlY3Rpb24ubXVsdGlwbHlCeShlYXNlIC8gZHVyYXRpb24pLFxuXHRcdFx0ICAgIHNwZWVkID0gc3BlZWRWZWN0b3IuZGlzdGFuY2VUbyhbMCwgMF0pLFxuXG5cdFx0XHQgICAgbGltaXRlZFNwZWVkID0gTWF0aC5taW4ob3B0aW9ucy5pbmVydGlhTWF4U3BlZWQsIHNwZWVkKSxcblx0XHRcdCAgICBsaW1pdGVkU3BlZWRWZWN0b3IgPSBzcGVlZFZlY3Rvci5tdWx0aXBseUJ5KGxpbWl0ZWRTcGVlZCAvIHNwZWVkKSxcblxuXHRcdFx0ICAgIGRlY2VsZXJhdGlvbkR1cmF0aW9uID0gbGltaXRlZFNwZWVkIC8gKG9wdGlvbnMuaW5lcnRpYURlY2VsZXJhdGlvbiAqIGVhc2UpLFxuXHRcdFx0ICAgIG9mZnNldCA9IGxpbWl0ZWRTcGVlZFZlY3Rvci5tdWx0aXBseUJ5KC1kZWNlbGVyYXRpb25EdXJhdGlvbiAvIDIpLnJvdW5kKCk7XG5cblx0XHRcdGlmICghb2Zmc2V0LnggJiYgIW9mZnNldC55KSB7XG5cdFx0XHRcdG1hcC5maXJlKCdtb3ZlZW5kJyk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG9mZnNldCA9IG1hcC5fbGltaXRPZmZzZXQob2Zmc2V0LCBtYXAub3B0aW9ucy5tYXhCb3VuZHMpO1xuXG5cdFx0XHRcdEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRtYXAucGFuQnkob2Zmc2V0LCB7XG5cdFx0XHRcdFx0XHRkdXJhdGlvbjogZGVjZWxlcmF0aW9uRHVyYXRpb24sXG5cdFx0XHRcdFx0XHRlYXNlTGluZWFyaXR5OiBlYXNlLFxuXHRcdFx0XHRcdFx0bm9Nb3ZlU3RhcnQ6IHRydWUsXG5cdFx0XHRcdFx0XHRhbmltYXRlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbkwuTWFwLmFkZEluaXRIb29rKCdhZGRIYW5kbGVyJywgJ2RyYWdnaW5nJywgTC5NYXAuRHJhZyk7XG5cblxuXG4vKlxuICogTC5IYW5kbGVyLkRvdWJsZUNsaWNrWm9vbSBpcyB1c2VkIHRvIGhhbmRsZSBkb3VibGUtY2xpY2sgem9vbSBvbiB0aGUgbWFwLCBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKi9cblxuTC5NYXAubWVyZ2VPcHRpb25zKHtcblx0ZG91YmxlQ2xpY2tab29tOiB0cnVlXG59KTtcblxuTC5NYXAuRG91YmxlQ2xpY2tab29tID0gTC5IYW5kbGVyLmV4dGVuZCh7XG5cdGFkZEhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fbWFwLm9uKCdkYmxjbGljaycsIHRoaXMuX29uRG91YmxlQ2xpY2ssIHRoaXMpO1xuXHR9LFxuXG5cdHJlbW92ZUhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fbWFwLm9mZignZGJsY2xpY2snLCB0aGlzLl9vbkRvdWJsZUNsaWNrLCB0aGlzKTtcblx0fSxcblxuXHRfb25Eb3VibGVDbGljazogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwLFxuXHRcdCAgICBvbGRab29tID0gbWFwLmdldFpvb20oKSxcblx0XHQgICAgem9vbSA9IGUub3JpZ2luYWxFdmVudC5zaGlmdEtleSA/IE1hdGguY2VpbChvbGRab29tKSAtIDEgOiBNYXRoLmZsb29yKG9sZFpvb20pICsgMTtcblxuXHRcdGlmIChtYXAub3B0aW9ucy5kb3VibGVDbGlja1pvb20gPT09ICdjZW50ZXInKSB7XG5cdFx0XHRtYXAuc2V0Wm9vbSh6b29tKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWFwLnNldFpvb21Bcm91bmQoZS5jb250YWluZXJQb2ludCwgem9vbSk7XG5cdFx0fVxuXHR9XG59KTtcblxuTC5NYXAuYWRkSW5pdEhvb2soJ2FkZEhhbmRsZXInLCAnZG91YmxlQ2xpY2tab29tJywgTC5NYXAuRG91YmxlQ2xpY2tab29tKTtcblxuXG5cbi8qXG4gKiBMLkhhbmRsZXIuU2Nyb2xsV2hlZWxab29tIGlzIHVzZWQgYnkgTC5NYXAgdG8gZW5hYmxlIG1vdXNlIHNjcm9sbCB3aGVlbCB6b29tIG9uIHRoZSBtYXAuXG4gKi9cblxuTC5NYXAubWVyZ2VPcHRpb25zKHtcblx0c2Nyb2xsV2hlZWxab29tOiB0cnVlLFxuXHR3aGVlbERlYm91bmNlVGltZTogNDBcbn0pO1xuXG5MLk1hcC5TY3JvbGxXaGVlbFpvb20gPSBMLkhhbmRsZXIuZXh0ZW5kKHtcblx0YWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbUV2ZW50Lm9uKHRoaXMuX21hcC5fY29udGFpbmVyLCB7XG5cdFx0XHRtb3VzZXdoZWVsOiB0aGlzLl9vbldoZWVsU2Nyb2xsLFxuXHRcdFx0TW96TW91c2VQaXhlbFNjcm9sbDogTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0dGhpcy5fZGVsdGEgPSAwO1xuXHR9LFxuXG5cdHJlbW92ZUhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0TC5Eb21FdmVudC5vZmYodGhpcy5fbWFwLl9jb250YWluZXIsIHtcblx0XHRcdG1vdXNld2hlZWw6IHRoaXMuX29uV2hlZWxTY3JvbGwsXG5cdFx0XHRNb3pNb3VzZVBpeGVsU2Nyb2xsOiBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0XG5cdFx0fSwgdGhpcyk7XG5cdH0sXG5cblx0X29uV2hlZWxTY3JvbGw6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIGRlbHRhID0gTC5Eb21FdmVudC5nZXRXaGVlbERlbHRhKGUpO1xuXHRcdHZhciBkZWJvdW5jZSA9IHRoaXMuX21hcC5vcHRpb25zLndoZWVsRGVib3VuY2VUaW1lO1xuXG5cdFx0dGhpcy5fZGVsdGEgKz0gZGVsdGE7XG5cdFx0dGhpcy5fbGFzdE1vdXNlUG9zID0gdGhpcy5fbWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXG5cdFx0aWYgKCF0aGlzLl9zdGFydFRpbWUpIHtcblx0XHRcdHRoaXMuX3N0YXJ0VGltZSA9ICtuZXcgRGF0ZSgpO1xuXHRcdH1cblxuXHRcdHZhciBsZWZ0ID0gTWF0aC5tYXgoZGVib3VuY2UgLSAoK25ldyBEYXRlKCkgLSB0aGlzLl9zdGFydFRpbWUpLCAwKTtcblxuXHRcdGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XG5cdFx0dGhpcy5fdGltZXIgPSBzZXRUaW1lb3V0KEwuYmluZCh0aGlzLl9wZXJmb3JtWm9vbSwgdGhpcyksIGxlZnQpO1xuXG5cdFx0TC5Eb21FdmVudC5zdG9wKGUpO1xuXHR9LFxuXG5cdF9wZXJmb3JtWm9vbTogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXG5cdFx0ICAgIGRlbHRhID0gdGhpcy5fZGVsdGEsXG5cdFx0ICAgIHpvb20gPSBtYXAuZ2V0Wm9vbSgpO1xuXG5cdFx0bWFwLnN0b3AoKTsgLy8gc3RvcCBwYW5uaW5nIGFuZCBmbHkgYW5pbWF0aW9ucyBpZiBhbnlcblxuXHRcdGRlbHRhID0gZGVsdGEgPiAwID8gTWF0aC5jZWlsKGRlbHRhKSA6IE1hdGguZmxvb3IoZGVsdGEpO1xuXHRcdGRlbHRhID0gTWF0aC5tYXgoTWF0aC5taW4oZGVsdGEsIDQpLCAtNCk7XG5cdFx0ZGVsdGEgPSBtYXAuX2xpbWl0Wm9vbSh6b29tICsgZGVsdGEpIC0gem9vbTtcblxuXHRcdHRoaXMuX2RlbHRhID0gMDtcblx0XHR0aGlzLl9zdGFydFRpbWUgPSBudWxsO1xuXG5cdFx0aWYgKCFkZWx0YSkgeyByZXR1cm47IH1cblxuXHRcdGlmIChtYXAub3B0aW9ucy5zY3JvbGxXaGVlbFpvb20gPT09ICdjZW50ZXInKSB7XG5cdFx0XHRtYXAuc2V0Wm9vbSh6b29tICsgZGVsdGEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtYXAuc2V0Wm9vbUFyb3VuZCh0aGlzLl9sYXN0TW91c2VQb3MsIHpvb20gKyBkZWx0YSk7XG5cdFx0fVxuXHR9XG59KTtcblxuTC5NYXAuYWRkSW5pdEhvb2soJ2FkZEhhbmRsZXInLCAnc2Nyb2xsV2hlZWxab29tJywgTC5NYXAuU2Nyb2xsV2hlZWxab29tKTtcblxuXG5cbi8qXHJcbiAqIEV4dGVuZHMgdGhlIGV2ZW50IGhhbmRsaW5nIGNvZGUgd2l0aCBkb3VibGUgdGFwIHN1cHBvcnQgZm9yIG1vYmlsZSBicm93c2Vycy5cclxuICovXHJcblxyXG5MLmV4dGVuZChMLkRvbUV2ZW50LCB7XHJcblxyXG5cdF90b3VjaHN0YXJ0OiBMLkJyb3dzZXIubXNQb2ludGVyID8gJ01TUG9pbnRlckRvd24nIDogTC5Ccm93c2VyLnBvaW50ZXIgPyAncG9pbnRlcmRvd24nIDogJ3RvdWNoc3RhcnQnLFxyXG5cdF90b3VjaGVuZDogTC5Ccm93c2VyLm1zUG9pbnRlciA/ICdNU1BvaW50ZXJVcCcgOiBMLkJyb3dzZXIucG9pbnRlciA/ICdwb2ludGVydXAnIDogJ3RvdWNoZW5kJyxcclxuXHJcblx0Ly8gaW5zcGlyZWQgYnkgWmVwdG8gdG91Y2ggY29kZSBieSBUaG9tYXMgRnVjaHNcclxuXHRhZGREb3VibGVUYXBMaXN0ZW5lcjogZnVuY3Rpb24gKG9iaiwgaGFuZGxlciwgaWQpIHtcclxuXHRcdHZhciBsYXN0LCB0b3VjaCxcclxuXHRcdCAgICBkb3VibGVUYXAgPSBmYWxzZSxcclxuXHRcdCAgICBkZWxheSA9IDI1MDtcclxuXHJcblx0XHRmdW5jdGlvbiBvblRvdWNoU3RhcnQoZSkge1xyXG5cdFx0XHR2YXIgY291bnQ7XHJcblxyXG5cdFx0XHRpZiAoTC5Ccm93c2VyLnBvaW50ZXIpIHtcclxuXHRcdFx0XHRjb3VudCA9IEwuRG9tRXZlbnQuX3BvaW50ZXJzQ291bnQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y291bnQgPSBlLnRvdWNoZXMubGVuZ3RoO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoY291bnQgPiAxKSB7IHJldHVybjsgfVxyXG5cclxuXHRcdFx0dmFyIG5vdyA9IERhdGUubm93KCksXHJcblx0XHRcdCAgICBkZWx0YSA9IG5vdyAtIChsYXN0IHx8IG5vdyk7XHJcblxyXG5cdFx0XHR0b3VjaCA9IGUudG91Y2hlcyA/IGUudG91Y2hlc1swXSA6IGU7XHJcblx0XHRcdGRvdWJsZVRhcCA9IChkZWx0YSA+IDAgJiYgZGVsdGEgPD0gZGVsYXkpO1xyXG5cdFx0XHRsYXN0ID0gbm93O1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIG9uVG91Y2hFbmQoKSB7XHJcblx0XHRcdGlmIChkb3VibGVUYXAgJiYgIXRvdWNoLmNhbmNlbEJ1YmJsZSkge1xyXG5cdFx0XHRcdGlmIChMLkJyb3dzZXIucG9pbnRlcikge1xyXG5cdFx0XHRcdFx0Ly8gd29yayBhcm91bmQgLnR5cGUgYmVpbmcgcmVhZG9ubHkgd2l0aCBNU1BvaW50ZXIqIGV2ZW50c1xyXG5cdFx0XHRcdFx0dmFyIG5ld1RvdWNoID0ge30sXHJcblx0XHRcdFx0XHQgICAgcHJvcCwgaTtcclxuXHJcblx0XHRcdFx0XHRmb3IgKGkgaW4gdG91Y2gpIHtcclxuXHRcdFx0XHRcdFx0cHJvcCA9IHRvdWNoW2ldO1xyXG5cdFx0XHRcdFx0XHRuZXdUb3VjaFtpXSA9IHByb3AgJiYgcHJvcC5iaW5kID8gcHJvcC5iaW5kKHRvdWNoKSA6IHByb3A7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0b3VjaCA9IG5ld1RvdWNoO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0b3VjaC50eXBlID0gJ2RibGNsaWNrJztcclxuXHRcdFx0XHRoYW5kbGVyKHRvdWNoKTtcclxuXHRcdFx0XHRsYXN0ID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBwcmUgPSAnX2xlYWZsZXRfJyxcclxuXHRcdCAgICB0b3VjaHN0YXJ0ID0gdGhpcy5fdG91Y2hzdGFydCxcclxuXHRcdCAgICB0b3VjaGVuZCA9IHRoaXMuX3RvdWNoZW5kO1xyXG5cclxuXHRcdG9ialtwcmUgKyB0b3VjaHN0YXJ0ICsgaWRdID0gb25Ub3VjaFN0YXJ0O1xyXG5cdFx0b2JqW3ByZSArIHRvdWNoZW5kICsgaWRdID0gb25Ub3VjaEVuZDtcclxuXHJcblx0XHRvYmouYWRkRXZlbnRMaXN0ZW5lcih0b3VjaHN0YXJ0LCBvblRvdWNoU3RhcnQsIGZhbHNlKTtcclxuXHRcdG9iai5hZGRFdmVudExpc3RlbmVyKHRvdWNoZW5kLCBvblRvdWNoRW5kLCBmYWxzZSk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRyZW1vdmVEb3VibGVUYXBMaXN0ZW5lcjogZnVuY3Rpb24gKG9iaiwgaWQpIHtcclxuXHRcdHZhciBwcmUgPSAnX2xlYWZsZXRfJyxcclxuXHRcdCAgICB0b3VjaGVuZCA9IG9ialtwcmUgKyB0aGlzLl90b3VjaGVuZCArIGlkXTtcclxuXHJcblx0XHRvYmoucmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLl90b3VjaHN0YXJ0LCBvYmpbcHJlICsgdGhpcy5fdG91Y2hzdGFydCArIGlkXSwgZmFsc2UpO1xyXG5cdFx0b2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5fdG91Y2hlbmQsIHRvdWNoZW5kLCBmYWxzZSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG59KTtcclxuXG5cblxuLypcbiAqIEV4dGVuZHMgTC5Eb21FdmVudCB0byBwcm92aWRlIHRvdWNoIHN1cHBvcnQgZm9yIEludGVybmV0IEV4cGxvcmVyIGFuZCBXaW5kb3dzLWJhc2VkIGRldmljZXMuXG4gKi9cblxuTC5leHRlbmQoTC5Eb21FdmVudCwge1xuXG5cdFBPSU5URVJfRE9XTjogICBMLkJyb3dzZXIubXNQb2ludGVyID8gJ01TUG9pbnRlckRvd24nICAgOiAncG9pbnRlcmRvd24nLFxuXHRQT0lOVEVSX01PVkU6ICAgTC5Ccm93c2VyLm1zUG9pbnRlciA/ICdNU1BvaW50ZXJNb3ZlJyAgIDogJ3BvaW50ZXJtb3ZlJyxcblx0UE9JTlRFUl9VUDogICAgIEwuQnJvd3Nlci5tc1BvaW50ZXIgPyAnTVNQb2ludGVyVXAnICAgICA6ICdwb2ludGVydXAnLFxuXHRQT0lOVEVSX0NBTkNFTDogTC5Ccm93c2VyLm1zUG9pbnRlciA/ICdNU1BvaW50ZXJDYW5jZWwnIDogJ3BvaW50ZXJjYW5jZWwnLFxuXG5cdF9wb2ludGVyczoge30sXG5cdF9wb2ludGVyc0NvdW50OiAwLFxuXG5cdC8vIFByb3ZpZGVzIGEgdG91Y2ggZXZlbnRzIHdyYXBwZXIgZm9yIChtcylwb2ludGVyIGV2ZW50cy5cblx0Ly8gcmVmIGh0dHA6Ly93d3cudzMub3JnL1RSL3BvaW50ZXJldmVudHMvIGh0dHBzOi8vd3d3LnczLm9yZy9CdWdzL1B1YmxpYy9zaG93X2J1Zy5jZ2k/aWQ9MjI4OTBcblxuXHRhZGRQb2ludGVyTGlzdGVuZXI6IGZ1bmN0aW9uIChvYmosIHR5cGUsIGhhbmRsZXIsIGlkKSB7XG5cblx0XHRpZiAodHlwZSA9PT0gJ3RvdWNoc3RhcnQnKSB7XG5cdFx0XHR0aGlzLl9hZGRQb2ludGVyU3RhcnQob2JqLCBoYW5kbGVyLCBpZCk7XG5cblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICd0b3VjaG1vdmUnKSB7XG5cdFx0XHR0aGlzLl9hZGRQb2ludGVyTW92ZShvYmosIGhhbmRsZXIsIGlkKTtcblxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ3RvdWNoZW5kJykge1xuXHRcdFx0dGhpcy5fYWRkUG9pbnRlckVuZChvYmosIGhhbmRsZXIsIGlkKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZW1vdmVQb2ludGVyTGlzdGVuZXI6IGZ1bmN0aW9uIChvYmosIHR5cGUsIGlkKSB7XG5cdFx0dmFyIGhhbmRsZXIgPSBvYmpbJ19sZWFmbGV0XycgKyB0eXBlICsgaWRdO1xuXG5cdFx0aWYgKHR5cGUgPT09ICd0b3VjaHN0YXJ0Jykge1xuXHRcdFx0b2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX0RPV04sIGhhbmRsZXIsIGZhbHNlKTtcblxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ3RvdWNobW92ZScpIHtcblx0XHRcdG9iai5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuUE9JTlRFUl9NT1ZFLCBoYW5kbGVyLCBmYWxzZSk7XG5cblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICd0b3VjaGVuZCcpIHtcblx0XHRcdG9iai5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuUE9JTlRFUl9VUCwgaGFuZGxlciwgZmFsc2UpO1xuXHRcdFx0b2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX0NBTkNFTCwgaGFuZGxlciwgZmFsc2UpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9hZGRQb2ludGVyU3RhcnQ6IGZ1bmN0aW9uIChvYmosIGhhbmRsZXIsIGlkKSB7XG5cdFx0dmFyIG9uRG93biA9IEwuYmluZChmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUucG9pbnRlclR5cGUgIT09ICdtb3VzZScgJiYgZS5wb2ludGVyVHlwZSAhPT0gZS5NU1BPSU5URVJfVFlQRV9NT1VTRSkge1xuXHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9oYW5kbGVQb2ludGVyKGUsIGhhbmRsZXIpO1xuXHRcdH0sIHRoaXMpO1xuXG5cdFx0b2JqWydfbGVhZmxldF90b3VjaHN0YXJ0JyArIGlkXSA9IG9uRG93bjtcblx0XHRvYmouYWRkRXZlbnRMaXN0ZW5lcih0aGlzLlBPSU5URVJfRE9XTiwgb25Eb3duLCBmYWxzZSk7XG5cblx0XHQvLyBuZWVkIHRvIGtlZXAgdHJhY2sgb2Ygd2hhdCBwb2ludGVycyBhbmQgaG93IG1hbnkgYXJlIGFjdGl2ZSB0byBwcm92aWRlIGUudG91Y2hlcyBlbXVsYXRpb25cblx0XHRpZiAoIXRoaXMuX3BvaW50ZXJEb2NMaXN0ZW5lcikge1xuXHRcdFx0dmFyIHBvaW50ZXJVcCA9IEwuYmluZCh0aGlzLl9nbG9iYWxQb2ludGVyVXAsIHRoaXMpO1xuXG5cdFx0XHQvLyB3ZSBsaXN0ZW4gZG9jdW1lbnRFbGVtZW50IGFzIGFueSBkcmFncyB0aGF0IGVuZCBieSBtb3ZpbmcgdGhlIHRvdWNoIG9mZiB0aGUgc2NyZWVuIGdldCBmaXJlZCB0aGVyZVxuXHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX0RPV04sIEwuYmluZCh0aGlzLl9nbG9iYWxQb2ludGVyRG93biwgdGhpcyksIHRydWUpO1xuXHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX01PVkUsIEwuYmluZCh0aGlzLl9nbG9iYWxQb2ludGVyTW92ZSwgdGhpcyksIHRydWUpO1xuXHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX1VQLCBwb2ludGVyVXAsIHRydWUpO1xuXHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5QT0lOVEVSX0NBTkNFTCwgcG9pbnRlclVwLCB0cnVlKTtcblxuXHRcdFx0dGhpcy5fcG9pbnRlckRvY0xpc3RlbmVyID0gdHJ1ZTtcblx0XHR9XG5cdH0sXG5cblx0X2dsb2JhbFBvaW50ZXJEb3duOiBmdW5jdGlvbiAoZSkge1xuXHRcdHRoaXMuX3BvaW50ZXJzW2UucG9pbnRlcklkXSA9IGU7XG5cdFx0dGhpcy5fcG9pbnRlcnNDb3VudCsrO1xuXHR9LFxuXG5cdF9nbG9iYWxQb2ludGVyTW92ZTogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAodGhpcy5fcG9pbnRlcnNbZS5wb2ludGVySWRdKSB7XG5cdFx0XHR0aGlzLl9wb2ludGVyc1tlLnBvaW50ZXJJZF0gPSBlO1xuXHRcdH1cblx0fSxcblxuXHRfZ2xvYmFsUG9pbnRlclVwOiBmdW5jdGlvbiAoZSkge1xuXHRcdGRlbGV0ZSB0aGlzLl9wb2ludGVyc1tlLnBvaW50ZXJJZF07XG5cdFx0dGhpcy5fcG9pbnRlcnNDb3VudC0tO1xuXHR9LFxuXG5cdF9oYW5kbGVQb2ludGVyOiBmdW5jdGlvbiAoZSwgaGFuZGxlcikge1xuXHRcdGUudG91Y2hlcyA9IFtdO1xuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5fcG9pbnRlcnMpIHtcblx0XHRcdGUudG91Y2hlcy5wdXNoKHRoaXMuX3BvaW50ZXJzW2ldKTtcblx0XHR9XG5cdFx0ZS5jaGFuZ2VkVG91Y2hlcyA9IFtlXTtcblxuXHRcdGhhbmRsZXIoZSk7XG5cdH0sXG5cblx0X2FkZFBvaW50ZXJNb3ZlOiBmdW5jdGlvbiAob2JqLCBoYW5kbGVyLCBpZCkge1xuXHRcdHZhciBvbk1vdmUgPSBMLmJpbmQoZnVuY3Rpb24gKGUpIHtcblx0XHRcdC8vIGRvbid0IGZpcmUgdG91Y2ggbW92ZXMgd2hlbiBtb3VzZSBpc24ndCBkb3duXG5cdFx0XHRpZiAoKGUucG9pbnRlclR5cGUgPT09IGUuTVNQT0lOVEVSX1RZUEVfTU9VU0UgfHwgZS5wb2ludGVyVHlwZSA9PT0gJ21vdXNlJykgJiYgZS5idXR0b25zID09PSAwKSB7IHJldHVybjsgfVxuXG5cdFx0XHR0aGlzLl9oYW5kbGVQb2ludGVyKGUsIGhhbmRsZXIpO1xuXHRcdH0sIHRoaXMpO1xuXG5cdFx0b2JqWydfbGVhZmxldF90b3VjaG1vdmUnICsgaWRdID0gb25Nb3ZlO1xuXHRcdG9iai5hZGRFdmVudExpc3RlbmVyKHRoaXMuUE9JTlRFUl9NT1ZFLCBvbk1vdmUsIGZhbHNlKTtcblx0fSxcblxuXHRfYWRkUG9pbnRlckVuZDogZnVuY3Rpb24gKG9iaiwgaGFuZGxlciwgaWQpIHtcblx0XHR2YXIgb25VcCA9IEwuYmluZChmdW5jdGlvbiAoZSkge1xuXHRcdFx0dGhpcy5faGFuZGxlUG9pbnRlcihlLCBoYW5kbGVyKTtcblx0XHR9LCB0aGlzKTtcblxuXHRcdG9ialsnX2xlYWZsZXRfdG91Y2hlbmQnICsgaWRdID0gb25VcDtcblx0XHRvYmouYWRkRXZlbnRMaXN0ZW5lcih0aGlzLlBPSU5URVJfVVAsIG9uVXAsIGZhbHNlKTtcblx0XHRvYmouYWRkRXZlbnRMaXN0ZW5lcih0aGlzLlBPSU5URVJfQ0FOQ0VMLCBvblVwLCBmYWxzZSk7XG5cdH1cbn0pO1xuXG5cblxuLypcbiAqIEwuSGFuZGxlci5Ub3VjaFpvb20gaXMgdXNlZCBieSBMLk1hcCB0byBhZGQgcGluY2ggem9vbSBvbiBzdXBwb3J0ZWQgbW9iaWxlIGJyb3dzZXJzLlxuICovXG5cbkwuTWFwLm1lcmdlT3B0aW9ucyh7XG5cdHRvdWNoWm9vbTogTC5Ccm93c2VyLnRvdWNoICYmICFMLkJyb3dzZXIuYW5kcm9pZDIzLFxuXHRib3VuY2VBdFpvb21MaW1pdHM6IHRydWVcbn0pO1xuXG5MLk1hcC5Ub3VjaFpvb20gPSBMLkhhbmRsZXIuZXh0ZW5kKHtcblx0YWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbUV2ZW50Lm9uKHRoaXMuX21hcC5fY29udGFpbmVyLCAndG91Y2hzdGFydCcsIHRoaXMuX29uVG91Y2hTdGFydCwgdGhpcyk7XG5cdH0sXG5cblx0cmVtb3ZlSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbUV2ZW50Lm9mZih0aGlzLl9tYXAuX2NvbnRhaW5lciwgJ3RvdWNoc3RhcnQnLCB0aGlzLl9vblRvdWNoU3RhcnQsIHRoaXMpO1xuXHR9LFxuXG5cdF9vblRvdWNoU3RhcnQ6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIG1hcCA9IHRoaXMuX21hcDtcblxuXHRcdGlmICghZS50b3VjaGVzIHx8IGUudG91Y2hlcy5sZW5ndGggIT09IDIgfHwgbWFwLl9hbmltYXRpbmdab29tIHx8IHRoaXMuX3pvb21pbmcpIHsgcmV0dXJuOyB9XG5cblx0XHR2YXIgcDEgPSBtYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZS50b3VjaGVzWzBdKSxcblx0XHQgICAgcDIgPSBtYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZS50b3VjaGVzWzFdKTtcblxuXHRcdHRoaXMuX2NlbnRlclBvaW50ID0gbWFwLmdldFNpemUoKS5fZGl2aWRlQnkoMik7XG5cdFx0dGhpcy5fc3RhcnRMYXRMbmcgPSBtYXAuY29udGFpbmVyUG9pbnRUb0xhdExuZyh0aGlzLl9jZW50ZXJQb2ludCk7XG5cdFx0aWYgKG1hcC5vcHRpb25zLnRvdWNoWm9vbSAhPT0gJ2NlbnRlcicpIHtcblx0XHRcdHRoaXMuX3BpbmNoU3RhcnRMYXRMbmcgPSBtYXAuY29udGFpbmVyUG9pbnRUb0xhdExuZyhwMS5hZGQocDIpLl9kaXZpZGVCeSgyKSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fc3RhcnREaXN0ID0gcDEuZGlzdGFuY2VUbyhwMik7XG5cdFx0dGhpcy5fc3RhcnRab29tID0gbWFwLmdldFpvb20oKTtcblxuXHRcdHRoaXMuX21vdmVkID0gZmFsc2U7XG5cdFx0dGhpcy5fem9vbWluZyA9IHRydWU7XG5cblx0XHRtYXAuc3RvcCgpO1xuXG5cdFx0TC5Eb21FdmVudFxuXHRcdCAgICAub24oZG9jdW1lbnQsICd0b3VjaG1vdmUnLCB0aGlzLl9vblRvdWNoTW92ZSwgdGhpcylcblx0XHQgICAgLm9uKGRvY3VtZW50LCAndG91Y2hlbmQnLCB0aGlzLl9vblRvdWNoRW5kLCB0aGlzKTtcblxuXHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdH0sXG5cblx0X29uVG91Y2hNb3ZlOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICghZS50b3VjaGVzIHx8IGUudG91Y2hlcy5sZW5ndGggIT09IDIgfHwgIXRoaXMuX3pvb21pbmcpIHsgcmV0dXJuOyB9XG5cblx0XHR2YXIgbWFwID0gdGhpcy5fbWFwLFxuXHRcdCAgICBwMSA9IG1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlLnRvdWNoZXNbMF0pLFxuXHRcdCAgICBwMiA9IG1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlLnRvdWNoZXNbMV0pLFxuXHRcdCAgICBzY2FsZSA9IHAxLmRpc3RhbmNlVG8ocDIpIC8gdGhpcy5fc3RhcnREaXN0O1xuXG5cblx0XHR0aGlzLl96b29tID0gbWFwLmdldFNjYWxlWm9vbShzY2FsZSwgdGhpcy5fc3RhcnRab29tKTtcblxuXHRcdGlmIChtYXAub3B0aW9ucy50b3VjaFpvb20gPT09ICdjZW50ZXInKSB7XG5cdFx0XHR0aGlzLl9jZW50ZXIgPSB0aGlzLl9zdGFydExhdExuZztcblx0XHRcdGlmIChzY2FsZSA9PT0gMSkgeyByZXR1cm47IH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gR2V0IGRlbHRhIGZyb20gcGluY2ggdG8gY2VudGVyLCBzbyBjZW50ZXJMYXRMbmcgaXMgZGVsdGEgYXBwbGllZCB0byBpbml0aWFsIHBpbmNoTGF0TG5nXG5cdFx0XHR2YXIgZGVsdGEgPSBwMS5fYWRkKHAyKS5fZGl2aWRlQnkoMikuX3N1YnRyYWN0KHRoaXMuX2NlbnRlclBvaW50KTtcblx0XHRcdGlmIChzY2FsZSA9PT0gMSAmJiBkZWx0YS54ID09PSAwICYmIGRlbHRhLnkgPT09IDApIHsgcmV0dXJuOyB9XG5cdFx0XHR0aGlzLl9jZW50ZXIgPSBtYXAudW5wcm9qZWN0KG1hcC5wcm9qZWN0KHRoaXMuX3BpbmNoU3RhcnRMYXRMbmcpLnN1YnRyYWN0KGRlbHRhKSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXAub3B0aW9ucy5ib3VuY2VBdFpvb21MaW1pdHMpIHtcblx0XHRcdGlmICgodGhpcy5fem9vbSA8PSBtYXAuZ2V0TWluWm9vbSgpICYmIHNjYWxlIDwgMSkgfHxcblx0XHQgICAgICAgICh0aGlzLl96b29tID49IG1hcC5nZXRNYXhab29tKCkgJiYgc2NhbGUgPiAxKSkgeyByZXR1cm47IH1cblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuX21vdmVkKSB7XG5cdFx0XHRtYXAuX21vdmVTdGFydCh0cnVlKTtcblx0XHRcdHRoaXMuX21vdmVkID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1SZXF1ZXN0KTtcblxuXHRcdHZhciBtb3ZlRm4gPSBMLmJpbmQobWFwLl9tb3ZlLCBtYXAsIHRoaXMuX2NlbnRlciwgdGhpcy5fem9vbSwge3BpbmNoOiB0cnVlLCByb3VuZDogZmFsc2V9KTtcblx0XHR0aGlzLl9hbmltUmVxdWVzdCA9IEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKG1vdmVGbiwgdGhpcywgdHJ1ZSk7XG5cblx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHR9LFxuXG5cdF9vblRvdWNoRW5kOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLl9tb3ZlZCB8fCAhdGhpcy5fem9vbWluZykge1xuXHRcdFx0dGhpcy5fem9vbWluZyA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuX3pvb21pbmcgPSBmYWxzZTtcblx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1SZXF1ZXN0KTtcblxuXHRcdEwuRG9tRXZlbnRcblx0XHQgICAgLm9mZihkb2N1bWVudCwgJ3RvdWNobW92ZScsIHRoaXMuX29uVG91Y2hNb3ZlKVxuXHRcdCAgICAub2ZmKGRvY3VtZW50LCAndG91Y2hlbmQnLCB0aGlzLl9vblRvdWNoRW5kKTtcblxuXHRcdHZhciB6b29tID0gdGhpcy5fem9vbTtcblx0XHR6b29tID0gdGhpcy5fbWFwLl9saW1pdFpvb20oem9vbSAtIHRoaXMuX3N0YXJ0Wm9vbSA+IDAgPyBNYXRoLmNlaWwoem9vbSkgOiBNYXRoLmZsb29yKHpvb20pKTtcblxuXG5cdFx0dGhpcy5fbWFwLl9hbmltYXRlWm9vbSh0aGlzLl9jZW50ZXIsIHpvb20sIHRydWUsIHRydWUpO1xuXHR9XG59KTtcblxuTC5NYXAuYWRkSW5pdEhvb2soJ2FkZEhhbmRsZXInLCAndG91Y2hab29tJywgTC5NYXAuVG91Y2hab29tKTtcblxuXG5cbi8qXG4gKiBMLk1hcC5UYXAgaXMgdXNlZCB0byBlbmFibGUgbW9iaWxlIGhhY2tzIGxpa2UgcXVpY2sgdGFwcyBhbmQgbG9uZyBob2xkLlxuICovXG5cbkwuTWFwLm1lcmdlT3B0aW9ucyh7XG5cdHRhcDogdHJ1ZSxcblx0dGFwVG9sZXJhbmNlOiAxNVxufSk7XG5cbkwuTWFwLlRhcCA9IEwuSGFuZGxlci5leHRlbmQoe1xuXHRhZGRIb29rczogZnVuY3Rpb24gKCkge1xuXHRcdEwuRG9tRXZlbnQub24odGhpcy5fbWFwLl9jb250YWluZXIsICd0b3VjaHN0YXJ0JywgdGhpcy5fb25Eb3duLCB0aGlzKTtcblx0fSxcblxuXHRyZW1vdmVIb29rczogZnVuY3Rpb24gKCkge1xuXHRcdEwuRG9tRXZlbnQub2ZmKHRoaXMuX21hcC5fY29udGFpbmVyLCAndG91Y2hzdGFydCcsIHRoaXMuX29uRG93biwgdGhpcyk7XG5cdH0sXG5cblx0X29uRG93bjogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoIWUudG91Y2hlcykgeyByZXR1cm47IH1cblxuXHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cblx0XHR0aGlzLl9maXJlQ2xpY2sgPSB0cnVlO1xuXG5cdFx0Ly8gZG9uJ3Qgc2ltdWxhdGUgY2xpY2sgb3IgdHJhY2sgbG9uZ3ByZXNzIGlmIG1vcmUgdGhhbiAxIHRvdWNoXG5cdFx0aWYgKGUudG91Y2hlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHR0aGlzLl9maXJlQ2xpY2sgPSBmYWxzZTtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLl9ob2xkVGltZW91dCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGZpcnN0ID0gZS50b3VjaGVzWzBdLFxuXHRcdCAgICBlbCA9IGZpcnN0LnRhcmdldDtcblxuXHRcdHRoaXMuX3N0YXJ0UG9zID0gdGhpcy5fbmV3UG9zID0gbmV3IEwuUG9pbnQoZmlyc3QuY2xpZW50WCwgZmlyc3QuY2xpZW50WSk7XG5cblx0XHQvLyBpZiB0b3VjaGluZyBhIGxpbmssIGhpZ2hsaWdodCBpdFxuXHRcdGlmIChlbC50YWdOYW1lICYmIGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2EnKSB7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3MoZWwsICdsZWFmbGV0LWFjdGl2ZScpO1xuXHRcdH1cblxuXHRcdC8vIHNpbXVsYXRlIGxvbmcgaG9sZCBidXQgc2V0dGluZyBhIHRpbWVvdXRcblx0XHR0aGlzLl9ob2xkVGltZW91dCA9IHNldFRpbWVvdXQoTC5iaW5kKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0aGlzLl9pc1RhcFZhbGlkKCkpIHtcblx0XHRcdFx0dGhpcy5fZmlyZUNsaWNrID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMuX29uVXAoKTtcblx0XHRcdFx0dGhpcy5fc2ltdWxhdGVFdmVudCgnY29udGV4dG1lbnUnLCBmaXJzdCk7XG5cdFx0XHR9XG5cdFx0fSwgdGhpcyksIDEwMDApO1xuXG5cdFx0dGhpcy5fc2ltdWxhdGVFdmVudCgnbW91c2Vkb3duJywgZmlyc3QpO1xuXG5cdFx0TC5Eb21FdmVudC5vbihkb2N1bWVudCwge1xuXHRcdFx0dG91Y2htb3ZlOiB0aGlzLl9vbk1vdmUsXG5cdFx0XHR0b3VjaGVuZDogdGhpcy5fb25VcFxuXHRcdH0sIHRoaXMpO1xuXHR9LFxuXG5cdF9vblVwOiBmdW5jdGlvbiAoZSkge1xuXHRcdGNsZWFyVGltZW91dCh0aGlzLl9ob2xkVGltZW91dCk7XG5cblx0XHRMLkRvbUV2ZW50Lm9mZihkb2N1bWVudCwge1xuXHRcdFx0dG91Y2htb3ZlOiB0aGlzLl9vbk1vdmUsXG5cdFx0XHR0b3VjaGVuZDogdGhpcy5fb25VcFxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0aWYgKHRoaXMuX2ZpcmVDbGljayAmJiBlICYmIGUuY2hhbmdlZFRvdWNoZXMpIHtcblxuXHRcdFx0dmFyIGZpcnN0ID0gZS5jaGFuZ2VkVG91Y2hlc1swXSxcblx0XHRcdCAgICBlbCA9IGZpcnN0LnRhcmdldDtcblxuXHRcdFx0aWYgKGVsICYmIGVsLnRhZ05hbWUgJiYgZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYScpIHtcblx0XHRcdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKGVsLCAnbGVhZmxldC1hY3RpdmUnKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fc2ltdWxhdGVFdmVudCgnbW91c2V1cCcsIGZpcnN0KTtcblxuXHRcdFx0Ly8gc2ltdWxhdGUgY2xpY2sgaWYgdGhlIHRvdWNoIGRpZG4ndCBtb3ZlIHRvbyBtdWNoXG5cdFx0XHRpZiAodGhpcy5faXNUYXBWYWxpZCgpKSB7XG5cdFx0XHRcdHRoaXMuX3NpbXVsYXRlRXZlbnQoJ2NsaWNrJywgZmlyc3QpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRfaXNUYXBWYWxpZDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9uZXdQb3MuZGlzdGFuY2VUbyh0aGlzLl9zdGFydFBvcykgPD0gdGhpcy5fbWFwLm9wdGlvbnMudGFwVG9sZXJhbmNlO1xuXHR9LFxuXG5cdF9vbk1vdmU6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dmFyIGZpcnN0ID0gZS50b3VjaGVzWzBdO1xuXHRcdHRoaXMuX25ld1BvcyA9IG5ldyBMLlBvaW50KGZpcnN0LmNsaWVudFgsIGZpcnN0LmNsaWVudFkpO1xuXHRcdHRoaXMuX3NpbXVsYXRlRXZlbnQoJ21vdXNlbW92ZScsIGZpcnN0KTtcblx0fSxcblxuXHRfc2ltdWxhdGVFdmVudDogZnVuY3Rpb24gKHR5cGUsIGUpIHtcblx0XHR2YXIgc2ltdWxhdGVkRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudHMnKTtcblxuXHRcdHNpbXVsYXRlZEV2ZW50Ll9zaW11bGF0ZWQgPSB0cnVlO1xuXHRcdGUudGFyZ2V0Ll9zaW11bGF0ZWRDbGljayA9IHRydWU7XG5cblx0XHRzaW11bGF0ZWRFdmVudC5pbml0TW91c2VFdmVudChcblx0XHQgICAgICAgIHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSxcblx0XHQgICAgICAgIGUuc2NyZWVuWCwgZS5zY3JlZW5ZLFxuXHRcdCAgICAgICAgZS5jbGllbnRYLCBlLmNsaWVudFksXG5cdFx0ICAgICAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgbnVsbCk7XG5cblx0XHRlLnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcblx0fVxufSk7XG5cbmlmIChMLkJyb3dzZXIudG91Y2ggJiYgIUwuQnJvd3Nlci5wb2ludGVyKSB7XG5cdEwuTWFwLmFkZEluaXRIb29rKCdhZGRIYW5kbGVyJywgJ3RhcCcsIEwuTWFwLlRhcCk7XG59XG5cblxuXG4vKlxuICogTC5IYW5kbGVyLlNoaWZ0RHJhZ1pvb20gaXMgdXNlZCB0byBhZGQgc2hpZnQtZHJhZyB6b29tIGludGVyYWN0aW9uIHRvIHRoZSBtYXBcbiAgKiAoem9vbSB0byBhIHNlbGVjdGVkIGJvdW5kaW5nIGJveCksIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqL1xuXG5MLk1hcC5tZXJnZU9wdGlvbnMoe1xuXHRib3hab29tOiB0cnVlXG59KTtcblxuTC5NYXAuQm94Wm9vbSA9IEwuSGFuZGxlci5leHRlbmQoe1xuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAobWFwKSB7XG5cdFx0dGhpcy5fbWFwID0gbWFwO1xuXHRcdHRoaXMuX2NvbnRhaW5lciA9IG1hcC5fY29udGFpbmVyO1xuXHRcdHRoaXMuX3BhbmUgPSBtYXAuX3BhbmVzLm92ZXJsYXlQYW5lO1xuXHR9LFxuXG5cdGFkZEhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0TC5Eb21FdmVudC5vbih0aGlzLl9jb250YWluZXIsICdtb3VzZWRvd24nLCB0aGlzLl9vbk1vdXNlRG93biwgdGhpcyk7XG5cdH0sXG5cblx0cmVtb3ZlSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbUV2ZW50Lm9mZih0aGlzLl9jb250YWluZXIsICdtb3VzZWRvd24nLCB0aGlzLl9vbk1vdXNlRG93biwgdGhpcyk7XG5cdH0sXG5cblx0bW92ZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbW92ZWQ7XG5cdH0sXG5cblx0X3Jlc2V0U3RhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9tb3ZlZCA9IGZhbHNlO1xuXHR9LFxuXG5cdF9vbk1vdXNlRG93bjogZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAoIWUuc2hpZnRLZXkgfHwgKChlLndoaWNoICE9PSAxKSAmJiAoZS5idXR0b24gIT09IDEpKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRcdHRoaXMuX3Jlc2V0U3RhdGUoKTtcblxuXHRcdEwuRG9tVXRpbC5kaXNhYmxlVGV4dFNlbGVjdGlvbigpO1xuXHRcdEwuRG9tVXRpbC5kaXNhYmxlSW1hZ2VEcmFnKCk7XG5cblx0XHR0aGlzLl9zdGFydFBvaW50ID0gdGhpcy5fbWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXG5cdFx0TC5Eb21FdmVudC5vbihkb2N1bWVudCwge1xuXHRcdFx0Y29udGV4dG1lbnU6IEwuRG9tRXZlbnQuc3RvcCxcblx0XHRcdG1vdXNlbW92ZTogdGhpcy5fb25Nb3VzZU1vdmUsXG5cdFx0XHRtb3VzZXVwOiB0aGlzLl9vbk1vdXNlVXAsXG5cdFx0XHRrZXlkb3duOiB0aGlzLl9vbktleURvd25cblx0XHR9LCB0aGlzKTtcblx0fSxcblxuXHRfb25Nb3VzZU1vdmU6IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKCF0aGlzLl9tb3ZlZCkge1xuXHRcdFx0dGhpcy5fbW92ZWQgPSB0cnVlO1xuXG5cdFx0XHR0aGlzLl9ib3ggPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC16b29tLWJveCcsIHRoaXMuX2NvbnRhaW5lcik7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1jcm9zc2hhaXInKTtcblxuXHRcdFx0dGhpcy5fbWFwLmZpcmUoJ2JveHpvb21zdGFydCcpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3BvaW50ID0gdGhpcy5fbWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXG5cdFx0dmFyIGJvdW5kcyA9IG5ldyBMLkJvdW5kcyh0aGlzLl9wb2ludCwgdGhpcy5fc3RhcnRQb2ludCksXG5cdFx0ICAgIHNpemUgPSBib3VuZHMuZ2V0U2l6ZSgpO1xuXG5cdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX2JveCwgYm91bmRzLm1pbik7XG5cblx0XHR0aGlzLl9ib3guc3R5bGUud2lkdGggID0gc2l6ZS54ICsgJ3B4Jztcblx0XHR0aGlzLl9ib3guc3R5bGUuaGVpZ2h0ID0gc2l6ZS55ICsgJ3B4Jztcblx0fSxcblxuXHRfZmluaXNoOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuX21vdmVkKSB7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2JveCk7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1jcm9zc2hhaXInKTtcblx0XHR9XG5cblx0XHRMLkRvbVV0aWwuZW5hYmxlVGV4dFNlbGVjdGlvbigpO1xuXHRcdEwuRG9tVXRpbC5lbmFibGVJbWFnZURyYWcoKTtcblxuXHRcdEwuRG9tRXZlbnQub2ZmKGRvY3VtZW50LCB7XG5cdFx0XHRjb250ZXh0bWVudTogTC5Eb21FdmVudC5zdG9wLFxuXHRcdFx0bW91c2Vtb3ZlOiB0aGlzLl9vbk1vdXNlTW92ZSxcblx0XHRcdG1vdXNldXA6IHRoaXMuX29uTW91c2VVcCxcblx0XHRcdGtleWRvd246IHRoaXMuX29uS2V5RG93blxuXHRcdH0sIHRoaXMpO1xuXHR9LFxuXG5cdF9vbk1vdXNlVXA6IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKChlLndoaWNoICE9PSAxKSAmJiAoZS5idXR0b24gIT09IDEpKSB7IHJldHVybjsgfVxuXG5cdFx0dGhpcy5fZmluaXNoKCk7XG5cblx0XHRpZiAoIXRoaXMuX21vdmVkKSB7IHJldHVybjsgfVxuXHRcdC8vIFBvc3Rwb25lIHRvIG5leHQgSlMgdGljayBzbyBpbnRlcm5hbCBjbGljayBldmVudCBoYW5kbGluZ1xuXHRcdC8vIHN0aWxsIHNlZSBpdCBhcyBcIm1vdmVkXCIuXG5cdFx0c2V0VGltZW91dChMLmJpbmQodGhpcy5fcmVzZXRTdGF0ZSwgdGhpcyksIDApO1xuXG5cdFx0dmFyIGJvdW5kcyA9IG5ldyBMLkxhdExuZ0JvdW5kcyhcblx0XHQgICAgICAgIHRoaXMuX21hcC5jb250YWluZXJQb2ludFRvTGF0TG5nKHRoaXMuX3N0YXJ0UG9pbnQpLFxuXHRcdCAgICAgICAgdGhpcy5fbWFwLmNvbnRhaW5lclBvaW50VG9MYXRMbmcodGhpcy5fcG9pbnQpKTtcblxuXHRcdHRoaXMuX21hcFxuXHRcdFx0LmZpdEJvdW5kcyhib3VuZHMpXG5cdFx0XHQuZmlyZSgnYm94em9vbWVuZCcsIHtib3hab29tQm91bmRzOiBib3VuZHN9KTtcblx0fSxcblxuXHRfb25LZXlEb3duOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmIChlLmtleUNvZGUgPT09IDI3KSB7XG5cdFx0XHR0aGlzLl9maW5pc2goKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5MLk1hcC5hZGRJbml0SG9vaygnYWRkSGFuZGxlcicsICdib3hab29tJywgTC5NYXAuQm94Wm9vbSk7XG5cblxuXG4vKlxuICogTC5NYXAuS2V5Ym9hcmQgaXMgaGFuZGxpbmcga2V5Ym9hcmQgaW50ZXJhY3Rpb24gd2l0aCB0aGUgbWFwLCBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKi9cblxuTC5NYXAubWVyZ2VPcHRpb25zKHtcblx0a2V5Ym9hcmQ6IHRydWUsXG5cdGtleWJvYXJkUGFuT2Zmc2V0OiA4MCxcblx0a2V5Ym9hcmRab29tT2Zmc2V0OiAxXG59KTtcblxuTC5NYXAuS2V5Ym9hcmQgPSBMLkhhbmRsZXIuZXh0ZW5kKHtcblxuXHRrZXlDb2Rlczoge1xuXHRcdGxlZnQ6ICAgIFszN10sXG5cdFx0cmlnaHQ6ICAgWzM5XSxcblx0XHRkb3duOiAgICBbNDBdLFxuXHRcdHVwOiAgICAgIFszOF0sXG5cdFx0em9vbUluOiAgWzE4NywgMTA3LCA2MSwgMTcxXSxcblx0XHR6b29tT3V0OiBbMTg5LCAxMDksIDU0LCAxNzNdXG5cdH0sXG5cblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24gKG1hcCkge1xuXHRcdHRoaXMuX21hcCA9IG1hcDtcblxuXHRcdHRoaXMuX3NldFBhbk9mZnNldChtYXAub3B0aW9ucy5rZXlib2FyZFBhbk9mZnNldCk7XG5cdFx0dGhpcy5fc2V0Wm9vbU9mZnNldChtYXAub3B0aW9ucy5rZXlib2FyZFpvb21PZmZzZXQpO1xuXHR9LFxuXG5cdGFkZEhvb2tzOiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGNvbnRhaW5lciA9IHRoaXMuX21hcC5fY29udGFpbmVyO1xuXG5cdFx0Ly8gbWFrZSB0aGUgY29udGFpbmVyIGZvY3VzYWJsZSBieSB0YWJiaW5nXG5cdFx0aWYgKGNvbnRhaW5lci50YWJJbmRleCA8PSAwKSB7XG5cdFx0XHRjb250YWluZXIudGFiSW5kZXggPSAnMCc7XG5cdFx0fVxuXG5cdFx0TC5Eb21FdmVudC5vbihjb250YWluZXIsIHtcblx0XHRcdGZvY3VzOiB0aGlzLl9vbkZvY3VzLFxuXHRcdFx0Ymx1cjogdGhpcy5fb25CbHVyLFxuXHRcdFx0bW91c2Vkb3duOiB0aGlzLl9vbk1vdXNlRG93blxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0dGhpcy5fbWFwLm9uKHtcblx0XHRcdGZvY3VzOiB0aGlzLl9hZGRIb29rcyxcblx0XHRcdGJsdXI6IHRoaXMuX3JlbW92ZUhvb2tzXG5cdFx0fSwgdGhpcyk7XG5cdH0sXG5cblx0cmVtb3ZlSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9yZW1vdmVIb29rcygpO1xuXG5cdFx0TC5Eb21FdmVudC5vZmYodGhpcy5fbWFwLl9jb250YWluZXIsIHtcblx0XHRcdGZvY3VzOiB0aGlzLl9vbkZvY3VzLFxuXHRcdFx0Ymx1cjogdGhpcy5fb25CbHVyLFxuXHRcdFx0bW91c2Vkb3duOiB0aGlzLl9vbk1vdXNlRG93blxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0dGhpcy5fbWFwLm9mZih7XG5cdFx0XHRmb2N1czogdGhpcy5fYWRkSG9va3MsXG5cdFx0XHRibHVyOiB0aGlzLl9yZW1vdmVIb29rc1xuXHRcdH0sIHRoaXMpO1xuXHR9LFxuXG5cdF9vbk1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLl9mb2N1c2VkKSB7IHJldHVybjsgfVxuXG5cdFx0dmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5LFxuXHRcdCAgICBkb2NFbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcblx0XHQgICAgdG9wID0gYm9keS5zY3JvbGxUb3AgfHwgZG9jRWwuc2Nyb2xsVG9wLFxuXHRcdCAgICBsZWZ0ID0gYm9keS5zY3JvbGxMZWZ0IHx8IGRvY0VsLnNjcm9sbExlZnQ7XG5cblx0XHR0aGlzLl9tYXAuX2NvbnRhaW5lci5mb2N1cygpO1xuXG5cdFx0d2luZG93LnNjcm9sbFRvKGxlZnQsIHRvcCk7XG5cdH0sXG5cblx0X29uRm9jdXM6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9mb2N1c2VkID0gdHJ1ZTtcblx0XHR0aGlzLl9tYXAuZmlyZSgnZm9jdXMnKTtcblx0fSxcblxuXHRfb25CbHVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5fZm9jdXNlZCA9IGZhbHNlO1xuXHRcdHRoaXMuX21hcC5maXJlKCdibHVyJyk7XG5cdH0sXG5cblx0X3NldFBhbk9mZnNldDogZnVuY3Rpb24gKHBhbikge1xuXHRcdHZhciBrZXlzID0gdGhpcy5fcGFuS2V5cyA9IHt9LFxuXHRcdCAgICBjb2RlcyA9IHRoaXMua2V5Q29kZXMsXG5cdFx0ICAgIGksIGxlbjtcblxuXHRcdGZvciAoaSA9IDAsIGxlbiA9IGNvZGVzLmxlZnQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdGtleXNbY29kZXMubGVmdFtpXV0gPSBbLTEgKiBwYW4sIDBdO1xuXHRcdH1cblx0XHRmb3IgKGkgPSAwLCBsZW4gPSBjb2Rlcy5yaWdodC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0a2V5c1tjb2Rlcy5yaWdodFtpXV0gPSBbcGFuLCAwXTtcblx0XHR9XG5cdFx0Zm9yIChpID0gMCwgbGVuID0gY29kZXMuZG93bi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0a2V5c1tjb2Rlcy5kb3duW2ldXSA9IFswLCBwYW5dO1xuXHRcdH1cblx0XHRmb3IgKGkgPSAwLCBsZW4gPSBjb2Rlcy51cC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0a2V5c1tjb2Rlcy51cFtpXV0gPSBbMCwgLTEgKiBwYW5dO1xuXHRcdH1cblx0fSxcblxuXHRfc2V0Wm9vbU9mZnNldDogZnVuY3Rpb24gKHpvb20pIHtcblx0XHR2YXIga2V5cyA9IHRoaXMuX3pvb21LZXlzID0ge30sXG5cdFx0ICAgIGNvZGVzID0gdGhpcy5rZXlDb2Rlcyxcblx0XHQgICAgaSwgbGVuO1xuXG5cdFx0Zm9yIChpID0gMCwgbGVuID0gY29kZXMuem9vbUluLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRrZXlzW2NvZGVzLnpvb21JbltpXV0gPSB6b29tO1xuXHRcdH1cblx0XHRmb3IgKGkgPSAwLCBsZW4gPSBjb2Rlcy56b29tT3V0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRrZXlzW2NvZGVzLnpvb21PdXRbaV1dID0gLXpvb207XG5cdFx0fVxuXHR9LFxuXG5cdF9hZGRIb29rczogZnVuY3Rpb24gKCkge1xuXHRcdEwuRG9tRXZlbnQub24oZG9jdW1lbnQsICdrZXlkb3duJywgdGhpcy5fb25LZXlEb3duLCB0aGlzKTtcblx0fSxcblxuXHRfcmVtb3ZlSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbUV2ZW50Lm9mZihkb2N1bWVudCwgJ2tleWRvd24nLCB0aGlzLl9vbktleURvd24sIHRoaXMpO1xuXHR9LFxuXG5cdF9vbktleURvd246IGZ1bmN0aW9uIChlKSB7XG5cdFx0aWYgKGUuYWx0S2V5IHx8IGUuY3RybEtleSB8fCBlLm1ldGFLZXkpIHsgcmV0dXJuOyB9XG5cblx0XHR2YXIga2V5ID0gZS5rZXlDb2RlLFxuXHRcdCAgICBtYXAgPSB0aGlzLl9tYXAsXG5cdFx0ICAgIG9mZnNldDtcblxuXHRcdGlmIChrZXkgaW4gdGhpcy5fcGFuS2V5cykge1xuXG5cdFx0XHRpZiAobWFwLl9wYW5BbmltICYmIG1hcC5fcGFuQW5pbS5faW5Qcm9ncmVzcykgeyByZXR1cm47IH1cblxuXHRcdFx0b2Zmc2V0ID0gdGhpcy5fcGFuS2V5c1trZXldO1xuXHRcdFx0aWYgKGUuc2hpZnRLZXkpIHtcblx0XHRcdFx0b2Zmc2V0ID0gTC5wb2ludChvZmZzZXQpLm11bHRpcGx5QnkoMyk7XG5cdFx0XHR9XG5cblx0XHRcdG1hcC5wYW5CeShvZmZzZXQpO1xuXG5cdFx0XHRpZiAobWFwLm9wdGlvbnMubWF4Qm91bmRzKSB7XG5cdFx0XHRcdG1hcC5wYW5JbnNpZGVCb3VuZHMobWFwLm9wdGlvbnMubWF4Qm91bmRzKTtcblx0XHRcdH1cblxuXHRcdH0gZWxzZSBpZiAoa2V5IGluIHRoaXMuX3pvb21LZXlzKSB7XG5cdFx0XHRtYXAuc2V0Wm9vbShtYXAuZ2V0Wm9vbSgpICsgKGUuc2hpZnRLZXkgPyAzIDogMSkgKiB0aGlzLl96b29tS2V5c1trZXldKTtcblxuXHRcdH0gZWxzZSBpZiAoa2V5ID09PSAyNykge1xuXHRcdFx0bWFwLmNsb3NlUG9wdXAoKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0TC5Eb21FdmVudC5zdG9wKGUpO1xuXHR9XG59KTtcblxuTC5NYXAuYWRkSW5pdEhvb2soJ2FkZEhhbmRsZXInLCAna2V5Ym9hcmQnLCBMLk1hcC5LZXlib2FyZCk7XG5cblxuXG4vKlxuICogTC5IYW5kbGVyLk1hcmtlckRyYWcgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IEwuTWFya2VyIHRvIG1ha2UgdGhlIG1hcmtlcnMgZHJhZ2dhYmxlLlxuICovXG5cbkwuSGFuZGxlci5NYXJrZXJEcmFnID0gTC5IYW5kbGVyLmV4dGVuZCh7XG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uIChtYXJrZXIpIHtcblx0XHR0aGlzLl9tYXJrZXIgPSBtYXJrZXI7XG5cdH0sXG5cblx0YWRkSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgaWNvbiA9IHRoaXMuX21hcmtlci5faWNvbjtcblxuXHRcdGlmICghdGhpcy5fZHJhZ2dhYmxlKSB7XG5cdFx0XHR0aGlzLl9kcmFnZ2FibGUgPSBuZXcgTC5EcmFnZ2FibGUoaWNvbiwgaWNvbiwgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fZHJhZ2dhYmxlLm9uKHtcblx0XHRcdGRyYWdzdGFydDogdGhpcy5fb25EcmFnU3RhcnQsXG5cdFx0XHRkcmFnOiB0aGlzLl9vbkRyYWcsXG5cdFx0XHRkcmFnZW5kOiB0aGlzLl9vbkRyYWdFbmRcblx0XHR9LCB0aGlzKS5lbmFibGUoKTtcblxuXHRcdEwuRG9tVXRpbC5hZGRDbGFzcyhpY29uLCAnbGVhZmxldC1tYXJrZXItZHJhZ2dhYmxlJyk7XG5cdH0sXG5cblx0cmVtb3ZlSG9va3M6IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLl9kcmFnZ2FibGUub2ZmKHtcblx0XHRcdGRyYWdzdGFydDogdGhpcy5fb25EcmFnU3RhcnQsXG5cdFx0XHRkcmFnOiB0aGlzLl9vbkRyYWcsXG5cdFx0XHRkcmFnZW5kOiB0aGlzLl9vbkRyYWdFbmRcblx0XHR9LCB0aGlzKS5kaXNhYmxlKCk7XG5cblx0XHRpZiAodGhpcy5fbWFya2VyLl9pY29uKSB7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fbWFya2VyLl9pY29uLCAnbGVhZmxldC1tYXJrZXItZHJhZ2dhYmxlJyk7XG5cdFx0fVxuXHR9LFxuXG5cdG1vdmVkOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RyYWdnYWJsZSAmJiB0aGlzLl9kcmFnZ2FibGUuX21vdmVkO1xuXHR9LFxuXG5cdF9vbkRyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuX21hcmtlclxuXHRcdCAgICAuY2xvc2VQb3B1cCgpXG5cdFx0ICAgIC5maXJlKCdtb3Zlc3RhcnQnKVxuXHRcdCAgICAuZmlyZSgnZHJhZ3N0YXJ0Jyk7XG5cdH0sXG5cblx0X29uRHJhZzogZnVuY3Rpb24gKGUpIHtcblx0XHR2YXIgbWFya2VyID0gdGhpcy5fbWFya2VyLFxuXHRcdCAgICBzaGFkb3cgPSBtYXJrZXIuX3NoYWRvdyxcblx0XHQgICAgaWNvblBvcyA9IEwuRG9tVXRpbC5nZXRQb3NpdGlvbihtYXJrZXIuX2ljb24pLFxuXHRcdCAgICBsYXRsbmcgPSBtYXJrZXIuX21hcC5sYXllclBvaW50VG9MYXRMbmcoaWNvblBvcyk7XG5cblx0XHQvLyB1cGRhdGUgc2hhZG93IHBvc2l0aW9uXG5cdFx0aWYgKHNoYWRvdykge1xuXHRcdFx0TC5Eb21VdGlsLnNldFBvc2l0aW9uKHNoYWRvdywgaWNvblBvcyk7XG5cdFx0fVxuXG5cdFx0bWFya2VyLl9sYXRsbmcgPSBsYXRsbmc7XG5cdFx0ZS5sYXRsbmcgPSBsYXRsbmc7XG5cblx0XHRtYXJrZXJcblx0XHQgICAgLmZpcmUoJ21vdmUnLCBlKVxuXHRcdCAgICAuZmlyZSgnZHJhZycsIGUpO1xuXHR9LFxuXG5cdF9vbkRyYWdFbmQ6IGZ1bmN0aW9uIChlKSB7XG5cdFx0dGhpcy5fbWFya2VyXG5cdFx0ICAgIC5maXJlKCdtb3ZlZW5kJylcblx0XHQgICAgLmZpcmUoJ2RyYWdlbmQnLCBlKTtcblx0fVxufSk7XG5cblxuXG4vKlxyXG4gKiBMLkNvbnRyb2wgaXMgYSBiYXNlIGNsYXNzIGZvciBpbXBsZW1lbnRpbmcgbWFwIGNvbnRyb2xzLiBIYW5kbGVzIHBvc2l0aW9uaW5nLlxyXG4gKiBBbGwgb3RoZXIgY29udHJvbHMgZXh0ZW5kIGZyb20gdGhpcyBjbGFzcy5cclxuICovXHJcblxyXG5MLkNvbnRyb2wgPSBMLkNsYXNzLmV4dGVuZCh7XHJcblx0b3B0aW9uczoge1xyXG5cdFx0cG9zaXRpb246ICd0b3ByaWdodCdcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdFx0TC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xyXG5cdH0sXHJcblxyXG5cdGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLnBvc2l0aW9uO1xyXG5cdH0sXHJcblxyXG5cdHNldFBvc2l0aW9uOiBmdW5jdGlvbiAocG9zaXRpb24pIHtcclxuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXA7XHJcblxyXG5cdFx0aWYgKG1hcCkge1xyXG5cdFx0XHRtYXAucmVtb3ZlQ29udHJvbCh0aGlzKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLm9wdGlvbnMucG9zaXRpb24gPSBwb3NpdGlvbjtcclxuXHJcblx0XHRpZiAobWFwKSB7XHJcblx0XHRcdG1hcC5hZGRDb250cm9sKHRoaXMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGdldENvbnRhaW5lcjogZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcclxuXHR9LFxyXG5cclxuXHRhZGRUbzogZnVuY3Rpb24gKG1hcCkge1xyXG5cdFx0dGhpcy5yZW1vdmUoKTtcclxuXHRcdHRoaXMuX21hcCA9IG1hcDtcclxuXHJcblx0XHR2YXIgY29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyID0gdGhpcy5vbkFkZChtYXApLFxyXG5cdFx0ICAgIHBvcyA9IHRoaXMuZ2V0UG9zaXRpb24oKSxcclxuXHRcdCAgICBjb3JuZXIgPSBtYXAuX2NvbnRyb2xDb3JuZXJzW3Bvc107XHJcblxyXG5cdFx0TC5Eb21VdGlsLmFkZENsYXNzKGNvbnRhaW5lciwgJ2xlYWZsZXQtY29udHJvbCcpO1xyXG5cclxuXHRcdGlmIChwb3MuaW5kZXhPZignYm90dG9tJykgIT09IC0xKSB7XHJcblx0XHRcdGNvcm5lci5pbnNlcnRCZWZvcmUoY29udGFpbmVyLCBjb3JuZXIuZmlyc3RDaGlsZCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb3JuZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRyZW1vdmU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdGlmICghdGhpcy5fbWFwKSB7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cclxuXHRcdEwuRG9tVXRpbC5yZW1vdmUodGhpcy5fY29udGFpbmVyKTtcclxuXHJcblx0XHRpZiAodGhpcy5vblJlbW92ZSkge1xyXG5cdFx0XHR0aGlzLm9uUmVtb3ZlKHRoaXMuX21hcCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fbWFwID0gbnVsbDtcclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRfcmVmb2N1c09uTWFwOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Ly8gaWYgbWFwIGV4aXN0cyBhbmQgZXZlbnQgaXMgbm90IGEga2V5Ym9hcmQgZXZlbnRcclxuXHRcdGlmICh0aGlzLl9tYXAgJiYgZSAmJiBlLnNjcmVlblggPiAwICYmIGUuc2NyZWVuWSA+IDApIHtcclxuXHRcdFx0dGhpcy5fbWFwLmdldENvbnRhaW5lcigpLmZvY3VzKCk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcbkwuY29udHJvbCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcblx0cmV0dXJuIG5ldyBMLkNvbnRyb2wob3B0aW9ucyk7XHJcbn07XHJcblxyXG5cclxuLy8gYWRkcyBjb250cm9sLXJlbGF0ZWQgbWV0aG9kcyB0byBMLk1hcFxyXG5cclxuTC5NYXAuaW5jbHVkZSh7XHJcblx0YWRkQ29udHJvbDogZnVuY3Rpb24gKGNvbnRyb2wpIHtcclxuXHRcdGNvbnRyb2wuYWRkVG8odGhpcyk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRyZW1vdmVDb250cm9sOiBmdW5jdGlvbiAoY29udHJvbCkge1xyXG5cdFx0Y29udHJvbC5yZW1vdmUoKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdF9pbml0Q29udHJvbFBvczogZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGNvcm5lcnMgPSB0aGlzLl9jb250cm9sQ29ybmVycyA9IHt9LFxyXG5cdFx0ICAgIGwgPSAnbGVhZmxldC0nLFxyXG5cdFx0ICAgIGNvbnRhaW5lciA9IHRoaXMuX2NvbnRyb2xDb250YWluZXIgPVxyXG5cdFx0ICAgICAgICAgICAgTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgbCArICdjb250cm9sLWNvbnRhaW5lcicsIHRoaXMuX2NvbnRhaW5lcik7XHJcblxyXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQ29ybmVyKHZTaWRlLCBoU2lkZSkge1xyXG5cdFx0XHR2YXIgY2xhc3NOYW1lID0gbCArIHZTaWRlICsgJyAnICsgbCArIGhTaWRlO1xyXG5cclxuXHRcdFx0Y29ybmVyc1t2U2lkZSArIGhTaWRlXSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSwgY29udGFpbmVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRjcmVhdGVDb3JuZXIoJ3RvcCcsICdsZWZ0Jyk7XHJcblx0XHRjcmVhdGVDb3JuZXIoJ3RvcCcsICdyaWdodCcpO1xyXG5cdFx0Y3JlYXRlQ29ybmVyKCdib3R0b20nLCAnbGVmdCcpO1xyXG5cdFx0Y3JlYXRlQ29ybmVyKCdib3R0b20nLCAncmlnaHQnKTtcclxuXHR9LFxyXG5cclxuXHRfY2xlYXJDb250cm9sUG9zOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbVV0aWwucmVtb3ZlKHRoaXMuX2NvbnRyb2xDb250YWluZXIpO1xyXG5cdH1cclxufSk7XHJcblxuXG5cbi8qXHJcbiAqIEwuQ29udHJvbC5ab29tIGlzIHVzZWQgZm9yIHRoZSBkZWZhdWx0IHpvb20gYnV0dG9ucyBvbiB0aGUgbWFwLlxyXG4gKi9cclxuXHJcbkwuQ29udHJvbC5ab29tID0gTC5Db250cm9sLmV4dGVuZCh7XHJcblx0b3B0aW9uczoge1xyXG5cdFx0cG9zaXRpb246ICd0b3BsZWZ0JyxcclxuXHRcdHpvb21JblRleHQ6ICcrJyxcclxuXHRcdHpvb21JblRpdGxlOiAnWm9vbSBpbicsXHJcblx0XHR6b29tT3V0VGV4dDogJy0nLFxyXG5cdFx0em9vbU91dFRpdGxlOiAnWm9vbSBvdXQnXHJcblx0fSxcclxuXHJcblx0b25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcclxuXHRcdHZhciB6b29tTmFtZSA9ICdsZWFmbGV0LWNvbnRyb2wtem9vbScsXHJcblx0XHQgICAgY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jywgem9vbU5hbWUgKyAnIGxlYWZsZXQtYmFyJyksXHJcblx0XHQgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcclxuXHJcblx0XHR0aGlzLl96b29tSW5CdXR0b24gID0gdGhpcy5fY3JlYXRlQnV0dG9uKG9wdGlvbnMuem9vbUluVGV4dCwgb3B0aW9ucy56b29tSW5UaXRsZSxcclxuXHRcdCAgICAgICAgem9vbU5hbWUgKyAnLWluJywgIGNvbnRhaW5lciwgdGhpcy5fem9vbUluKTtcclxuXHRcdHRoaXMuX3pvb21PdXRCdXR0b24gPSB0aGlzLl9jcmVhdGVCdXR0b24ob3B0aW9ucy56b29tT3V0VGV4dCwgb3B0aW9ucy56b29tT3V0VGl0bGUsXHJcblx0XHQgICAgICAgIHpvb21OYW1lICsgJy1vdXQnLCBjb250YWluZXIsIHRoaXMuX3pvb21PdXQpO1xyXG5cclxuXHRcdHRoaXMuX3VwZGF0ZURpc2FibGVkKCk7XHJcblx0XHRtYXAub24oJ3pvb21lbmQgem9vbWxldmVsc2NoYW5nZScsIHRoaXMuX3VwZGF0ZURpc2FibGVkLCB0aGlzKTtcclxuXHJcblx0XHRyZXR1cm4gY29udGFpbmVyO1xyXG5cdH0sXHJcblxyXG5cdG9uUmVtb3ZlOiBmdW5jdGlvbiAobWFwKSB7XHJcblx0XHRtYXAub2ZmKCd6b29tZW5kIHpvb21sZXZlbHNjaGFuZ2UnLCB0aGlzLl91cGRhdGVEaXNhYmxlZCwgdGhpcyk7XHJcblx0fSxcclxuXHJcblx0ZGlzYWJsZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpcy5fZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0dGhpcy5fdXBkYXRlRGlzYWJsZWQoKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGVuYWJsZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0dGhpcy5fZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuX3VwZGF0ZURpc2FibGVkKCk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRfem9vbUluOiBmdW5jdGlvbiAoZSkge1xyXG5cdFx0aWYgKCF0aGlzLl9kaXNhYmxlZCkge1xyXG5cdFx0XHR0aGlzLl9tYXAuem9vbUluKGUuc2hpZnRLZXkgPyAzIDogMSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X3pvb21PdXQ6IGZ1bmN0aW9uIChlKSB7XHJcblx0XHRpZiAoIXRoaXMuX2Rpc2FibGVkKSB7XHJcblx0XHRcdHRoaXMuX21hcC56b29tT3V0KGUuc2hpZnRLZXkgPyAzIDogMSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X2NyZWF0ZUJ1dHRvbjogZnVuY3Rpb24gKGh0bWwsIHRpdGxlLCBjbGFzc05hbWUsIGNvbnRhaW5lciwgZm4pIHtcclxuXHRcdHZhciBsaW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsIGNsYXNzTmFtZSwgY29udGFpbmVyKTtcclxuXHRcdGxpbmsuaW5uZXJIVE1MID0gaHRtbDtcclxuXHRcdGxpbmsuaHJlZiA9ICcjJztcclxuXHRcdGxpbmsudGl0bGUgPSB0aXRsZTtcclxuXHJcblx0XHRMLkRvbUV2ZW50XHJcblx0XHQgICAgLm9uKGxpbmssICdtb3VzZWRvd24gZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbilcclxuXHRcdCAgICAub24obGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wKVxyXG5cdFx0ICAgIC5vbihsaW5rLCAnY2xpY2snLCBmbiwgdGhpcylcclxuXHRcdCAgICAub24obGluaywgJ2NsaWNrJywgdGhpcy5fcmVmb2N1c09uTWFwLCB0aGlzKTtcclxuXHJcblx0XHRyZXR1cm4gbGluaztcclxuXHR9LFxyXG5cclxuXHRfdXBkYXRlRGlzYWJsZWQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXHJcblx0XHQgICAgY2xhc3NOYW1lID0gJ2xlYWZsZXQtZGlzYWJsZWQnO1xyXG5cclxuXHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl96b29tSW5CdXR0b24sIGNsYXNzTmFtZSk7XHJcblx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fem9vbU91dEJ1dHRvbiwgY2xhc3NOYW1lKTtcclxuXHJcblx0XHRpZiAodGhpcy5fZGlzYWJsZWQgfHwgbWFwLl96b29tID09PSBtYXAuZ2V0TWluWm9vbSgpKSB7XHJcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl96b29tT3V0QnV0dG9uLCBjbGFzc05hbWUpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuX2Rpc2FibGVkIHx8IG1hcC5fem9vbSA9PT0gbWFwLmdldE1heFpvb20oKSkge1xyXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fem9vbUluQnV0dG9uLCBjbGFzc05hbWUpO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5MLk1hcC5tZXJnZU9wdGlvbnMoe1xyXG5cdHpvb21Db250cm9sOiB0cnVlXHJcbn0pO1xyXG5cclxuTC5NYXAuYWRkSW5pdEhvb2soZnVuY3Rpb24gKCkge1xyXG5cdGlmICh0aGlzLm9wdGlvbnMuem9vbUNvbnRyb2wpIHtcclxuXHRcdHRoaXMuem9vbUNvbnRyb2wgPSBuZXcgTC5Db250cm9sLlpvb20oKTtcclxuXHRcdHRoaXMuYWRkQ29udHJvbCh0aGlzLnpvb21Db250cm9sKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuTC5jb250cm9sLnpvb20gPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdHJldHVybiBuZXcgTC5Db250cm9sLlpvb20ob3B0aW9ucyk7XHJcbn07XHJcblxuXG5cbi8qXHJcbiAqIEwuQ29udHJvbC5BdHRyaWJ1dGlvbiBpcyB1c2VkIGZvciBkaXNwbGF5aW5nIGF0dHJpYnV0aW9uIG9uIHRoZSBtYXAgKGFkZGVkIGJ5IGRlZmF1bHQpLlxyXG4gKi9cclxuXHJcbkwuQ29udHJvbC5BdHRyaWJ1dGlvbiA9IEwuQ29udHJvbC5leHRlbmQoe1xyXG5cdG9wdGlvbnM6IHtcclxuXHRcdHBvc2l0aW9uOiAnYm90dG9tcmlnaHQnLFxyXG5cdFx0cHJlZml4OiAnPGEgaHJlZj1cImh0dHA6Ly9sZWFmbGV0anMuY29tXCIgdGl0bGU9XCJBIEpTIGxpYnJhcnkgZm9yIGludGVyYWN0aXZlIG1hcHNcIj5MZWFmbGV0PC9hPidcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdFx0TC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xyXG5cclxuXHRcdHRoaXMuX2F0dHJpYnV0aW9ucyA9IHt9O1xyXG5cdH0sXHJcblxyXG5cdG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XHJcblx0XHR0aGlzLl9jb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC1jb250cm9sLWF0dHJpYnV0aW9uJyk7XHJcblx0XHRpZiAoTC5Eb21FdmVudCkge1xyXG5cdFx0XHRMLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKHRoaXMuX2NvbnRhaW5lcik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVE9ETyB1Z2x5LCByZWZhY3RvclxyXG5cdFx0Zm9yICh2YXIgaSBpbiBtYXAuX2xheWVycykge1xyXG5cdFx0XHRpZiAobWFwLl9sYXllcnNbaV0uZ2V0QXR0cmlidXRpb24pIHtcclxuXHRcdFx0XHR0aGlzLmFkZEF0dHJpYnV0aW9uKG1hcC5fbGF5ZXJzW2ldLmdldEF0dHJpYnV0aW9uKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fdXBkYXRlKCk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcclxuXHR9LFxyXG5cclxuXHRzZXRQcmVmaXg6IGZ1bmN0aW9uIChwcmVmaXgpIHtcclxuXHRcdHRoaXMub3B0aW9ucy5wcmVmaXggPSBwcmVmaXg7XHJcblx0XHR0aGlzLl91cGRhdGUoKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdGFkZEF0dHJpYnV0aW9uOiBmdW5jdGlvbiAodGV4dCkge1xyXG5cdFx0aWYgKCF0ZXh0KSB7IHJldHVybiB0aGlzOyB9XHJcblxyXG5cdFx0aWYgKCF0aGlzLl9hdHRyaWJ1dGlvbnNbdGV4dF0pIHtcclxuXHRcdFx0dGhpcy5fYXR0cmlidXRpb25zW3RleHRdID0gMDtcclxuXHRcdH1cclxuXHRcdHRoaXMuX2F0dHJpYnV0aW9uc1t0ZXh0XSsrO1xyXG5cclxuXHRcdHRoaXMuX3VwZGF0ZSgpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZUF0dHJpYnV0aW9uOiBmdW5jdGlvbiAodGV4dCkge1xyXG5cdFx0aWYgKCF0ZXh0KSB7IHJldHVybiB0aGlzOyB9XHJcblxyXG5cdFx0aWYgKHRoaXMuX2F0dHJpYnV0aW9uc1t0ZXh0XSkge1xyXG5cdFx0XHR0aGlzLl9hdHRyaWJ1dGlvbnNbdGV4dF0tLTtcclxuXHRcdFx0dGhpcy5fdXBkYXRlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9tYXApIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0dmFyIGF0dHJpYnMgPSBbXTtcclxuXHJcblx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2F0dHJpYnV0aW9ucykge1xyXG5cdFx0XHRpZiAodGhpcy5fYXR0cmlidXRpb25zW2ldKSB7XHJcblx0XHRcdFx0YXR0cmlicy5wdXNoKGkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHByZWZpeEFuZEF0dHJpYnMgPSBbXTtcclxuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnByZWZpeCkge1xyXG5cdFx0XHRwcmVmaXhBbmRBdHRyaWJzLnB1c2godGhpcy5vcHRpb25zLnByZWZpeCk7XHJcblx0XHR9XHJcblx0XHRpZiAoYXR0cmlicy5sZW5ndGgpIHtcclxuXHRcdFx0cHJlZml4QW5kQXR0cmlicy5wdXNoKGF0dHJpYnMuam9pbignLCAnKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fY29udGFpbmVyLmlubmVySFRNTCA9IHByZWZpeEFuZEF0dHJpYnMuam9pbignIHwgJyk7XHJcblx0fVxyXG59KTtcclxuXHJcbkwuTWFwLm1lcmdlT3B0aW9ucyh7XHJcblx0YXR0cmlidXRpb25Db250cm9sOiB0cnVlXHJcbn0pO1xyXG5cclxuTC5NYXAuYWRkSW5pdEhvb2soZnVuY3Rpb24gKCkge1xyXG5cdGlmICh0aGlzLm9wdGlvbnMuYXR0cmlidXRpb25Db250cm9sKSB7XHJcblx0XHR0aGlzLmF0dHJpYnV0aW9uQ29udHJvbCA9IChuZXcgTC5Db250cm9sLkF0dHJpYnV0aW9uKCkpLmFkZFRvKHRoaXMpO1xyXG5cdH1cclxufSk7XHJcblxyXG5MLmNvbnRyb2wuYXR0cmlidXRpb24gPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cdHJldHVybiBuZXcgTC5Db250cm9sLkF0dHJpYnV0aW9uKG9wdGlvbnMpO1xyXG59O1xyXG5cblxuXG4vKlxuICogTC5Db250cm9sLlNjYWxlIGlzIHVzZWQgZm9yIGRpc3BsYXlpbmcgbWV0cmljL2ltcGVyaWFsIHNjYWxlIG9uIHRoZSBtYXAuXG4gKi9cblxuTC5Db250cm9sLlNjYWxlID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdG9wdGlvbnM6IHtcblx0XHRwb3NpdGlvbjogJ2JvdHRvbWxlZnQnLFxuXHRcdG1heFdpZHRoOiAxMDAsXG5cdFx0bWV0cmljOiB0cnVlLFxuXHRcdGltcGVyaWFsOiB0cnVlXG5cdFx0Ly8gdXBkYXRlV2hlbklkbGU6IGZhbHNlXG5cdH0sXG5cblx0b25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gJ2xlYWZsZXQtY29udHJvbC1zY2FsZScsXG5cdFx0ICAgIGNvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSksXG5cdFx0ICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHR0aGlzLl9hZGRTY2FsZXMob3B0aW9ucywgY2xhc3NOYW1lICsgJy1saW5lJywgY29udGFpbmVyKTtcblxuXHRcdG1hcC5vbihvcHRpb25zLnVwZGF0ZVdoZW5JZGxlID8gJ21vdmVlbmQnIDogJ21vdmUnLCB0aGlzLl91cGRhdGUsIHRoaXMpO1xuXHRcdG1hcC53aGVuUmVhZHkodGhpcy5fdXBkYXRlLCB0aGlzKTtcblxuXHRcdHJldHVybiBjb250YWluZXI7XG5cdH0sXG5cblx0b25SZW1vdmU6IGZ1bmN0aW9uIChtYXApIHtcblx0XHRtYXAub2ZmKHRoaXMub3B0aW9ucy51cGRhdGVXaGVuSWRsZSA/ICdtb3ZlZW5kJyA6ICdtb3ZlJywgdGhpcy5fdXBkYXRlLCB0aGlzKTtcblx0fSxcblxuXHRfYWRkU2NhbGVzOiBmdW5jdGlvbiAob3B0aW9ucywgY2xhc3NOYW1lLCBjb250YWluZXIpIHtcblx0XHRpZiAob3B0aW9ucy5tZXRyaWMpIHtcblx0XHRcdHRoaXMuX21TY2FsZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSwgY29udGFpbmVyKTtcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuaW1wZXJpYWwpIHtcblx0XHRcdHRoaXMuX2lTY2FsZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSwgY29udGFpbmVyKTtcblx0XHR9XG5cdH0sXG5cblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBtYXAgPSB0aGlzLl9tYXAsXG5cdFx0ICAgIHkgPSBtYXAuZ2V0U2l6ZSgpLnkgLyAyO1xuXG5cdFx0dmFyIG1heE1ldGVycyA9IG1hcC5kaXN0YW5jZShcblx0XHRcdFx0bWFwLmNvbnRhaW5lclBvaW50VG9MYXRMbmcoWzAsIHldKSxcblx0XHRcdFx0bWFwLmNvbnRhaW5lclBvaW50VG9MYXRMbmcoW3RoaXMub3B0aW9ucy5tYXhXaWR0aCwgeV0pKTtcblxuXHRcdHRoaXMuX3VwZGF0ZVNjYWxlcyhtYXhNZXRlcnMpO1xuXHR9LFxuXG5cdF91cGRhdGVTY2FsZXM6IGZ1bmN0aW9uIChtYXhNZXRlcnMpIHtcblx0XHRpZiAodGhpcy5vcHRpb25zLm1ldHJpYyAmJiBtYXhNZXRlcnMpIHtcblx0XHRcdHRoaXMuX3VwZGF0ZU1ldHJpYyhtYXhNZXRlcnMpO1xuXHRcdH1cblx0XHRpZiAodGhpcy5vcHRpb25zLmltcGVyaWFsICYmIG1heE1ldGVycykge1xuXHRcdFx0dGhpcy5fdXBkYXRlSW1wZXJpYWwobWF4TWV0ZXJzKTtcblx0XHR9XG5cdH0sXG5cblx0X3VwZGF0ZU1ldHJpYzogZnVuY3Rpb24gKG1heE1ldGVycykge1xuXHRcdHZhciBtZXRlcnMgPSB0aGlzLl9nZXRSb3VuZE51bShtYXhNZXRlcnMpLFxuXHRcdCAgICBsYWJlbCA9IG1ldGVycyA8IDEwMDAgPyBtZXRlcnMgKyAnIG0nIDogKG1ldGVycyAvIDEwMDApICsgJyBrbSc7XG5cblx0XHR0aGlzLl91cGRhdGVTY2FsZSh0aGlzLl9tU2NhbGUsIGxhYmVsLCBtZXRlcnMgLyBtYXhNZXRlcnMpO1xuXHR9LFxuXG5cdF91cGRhdGVJbXBlcmlhbDogZnVuY3Rpb24gKG1heE1ldGVycykge1xuXHRcdHZhciBtYXhGZWV0ID0gbWF4TWV0ZXJzICogMy4yODA4Mzk5LFxuXHRcdCAgICBtYXhNaWxlcywgbWlsZXMsIGZlZXQ7XG5cblx0XHRpZiAobWF4RmVldCA+IDUyODApIHtcblx0XHRcdG1heE1pbGVzID0gbWF4RmVldCAvIDUyODA7XG5cdFx0XHRtaWxlcyA9IHRoaXMuX2dldFJvdW5kTnVtKG1heE1pbGVzKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVNjYWxlKHRoaXMuX2lTY2FsZSwgbWlsZXMgKyAnIG1pJywgbWlsZXMgLyBtYXhNaWxlcyk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmVldCA9IHRoaXMuX2dldFJvdW5kTnVtKG1heEZlZXQpO1xuXHRcdFx0dGhpcy5fdXBkYXRlU2NhbGUodGhpcy5faVNjYWxlLCBmZWV0ICsgJyBmdCcsIGZlZXQgLyBtYXhGZWV0KTtcblx0XHR9XG5cdH0sXG5cblx0X3VwZGF0ZVNjYWxlOiBmdW5jdGlvbiAoc2NhbGUsIHRleHQsIHJhdGlvKSB7XG5cdFx0c2NhbGUuc3R5bGUud2lkdGggPSBNYXRoLnJvdW5kKHRoaXMub3B0aW9ucy5tYXhXaWR0aCAqIHJhdGlvKSArICdweCc7XG5cdFx0c2NhbGUuaW5uZXJIVE1MID0gdGV4dDtcblx0fSxcblxuXHRfZ2V0Um91bmROdW06IGZ1bmN0aW9uIChudW0pIHtcblx0XHR2YXIgcG93MTAgPSBNYXRoLnBvdygxMCwgKE1hdGguZmxvb3IobnVtKSArICcnKS5sZW5ndGggLSAxKSxcblx0XHQgICAgZCA9IG51bSAvIHBvdzEwO1xuXG5cdFx0ZCA9IGQgPj0gMTAgPyAxMCA6XG5cdFx0ICAgIGQgPj0gNSA/IDUgOlxuXHRcdCAgICBkID49IDMgPyAzIDpcblx0XHQgICAgZCA+PSAyID8gMiA6IDE7XG5cblx0XHRyZXR1cm4gcG93MTAgKiBkO1xuXHR9XG59KTtcblxuTC5jb250cm9sLnNjYWxlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0cmV0dXJuIG5ldyBMLkNvbnRyb2wuU2NhbGUob3B0aW9ucyk7XG59O1xuXG5cblxuLypcclxuICogTC5Db250cm9sLkxheWVycyBpcyBhIGNvbnRyb2wgdG8gYWxsb3cgdXNlcnMgdG8gc3dpdGNoIGJldHdlZW4gZGlmZmVyZW50IGxheWVycyBvbiB0aGUgbWFwLlxyXG4gKi9cclxuXHJcbkwuQ29udHJvbC5MYXllcnMgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcclxuXHRvcHRpb25zOiB7XHJcblx0XHRjb2xsYXBzZWQ6IHRydWUsXHJcblx0XHRwb3NpdGlvbjogJ3RvcHJpZ2h0JyxcclxuXHRcdGF1dG9aSW5kZXg6IHRydWUsXHJcblx0XHRoaWRlU2luZ2xlQmFzZTogZmFsc2VcclxuXHR9LFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbiAoYmFzZUxheWVycywgb3ZlcmxheXMsIG9wdGlvbnMpIHtcclxuXHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcclxuXHJcblx0XHR0aGlzLl9sYXllcnMgPSB7fTtcclxuXHRcdHRoaXMuX2xhc3RaSW5kZXggPSAwO1xyXG5cdFx0dGhpcy5faGFuZGxpbmdDbGljayA9IGZhbHNlO1xyXG5cclxuXHRcdGZvciAodmFyIGkgaW4gYmFzZUxheWVycykge1xyXG5cdFx0XHR0aGlzLl9hZGRMYXllcihiYXNlTGF5ZXJzW2ldLCBpKTtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKGkgaW4gb3ZlcmxheXMpIHtcclxuXHRcdFx0dGhpcy5fYWRkTGF5ZXIob3ZlcmxheXNbaV0sIGksIHRydWUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XHJcblx0XHR0aGlzLl9pbml0TGF5b3V0KCk7XHJcblx0XHR0aGlzLl91cGRhdGUoKTtcclxuXHJcblx0XHR0aGlzLl9tYXAgPSBtYXA7XHJcblx0XHRtYXAub24oJ3pvb21lbmQnLCB0aGlzLl9jaGVja0Rpc2FibGVkTGF5ZXJzLCB0aGlzKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xyXG5cdH0sXHJcblxyXG5cdG9uUmVtb3ZlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR0aGlzLl9tYXAub2ZmKCd6b29tZW5kJywgdGhpcy5fY2hlY2tEaXNhYmxlZExheWVycywgdGhpcyk7XHJcblx0fSxcclxuXHJcblx0YWRkQmFzZUxheWVyOiBmdW5jdGlvbiAobGF5ZXIsIG5hbWUpIHtcclxuXHRcdHRoaXMuX2FkZExheWVyKGxheWVyLCBuYW1lKTtcclxuXHRcdHJldHVybiB0aGlzLl91cGRhdGUoKTtcclxuXHR9LFxyXG5cclxuXHRhZGRPdmVybGF5OiBmdW5jdGlvbiAobGF5ZXIsIG5hbWUpIHtcclxuXHRcdHRoaXMuX2FkZExheWVyKGxheWVyLCBuYW1lLCB0cnVlKTtcclxuXHRcdHJldHVybiB0aGlzLl91cGRhdGUoKTtcclxuXHR9LFxyXG5cclxuXHRyZW1vdmVMYXllcjogZnVuY3Rpb24gKGxheWVyKSB7XHJcblx0XHRsYXllci5vZmYoJ2FkZCByZW1vdmUnLCB0aGlzLl9vbkxheWVyQ2hhbmdlLCB0aGlzKTtcclxuXHJcblx0XHRkZWxldGUgdGhpcy5fbGF5ZXJzW0wuc3RhbXAobGF5ZXIpXTtcclxuXHRcdHJldHVybiB0aGlzLl91cGRhdGUoKTtcclxuXHR9LFxyXG5cclxuXHRfaW5pdExheW91dDogZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGNsYXNzTmFtZSA9ICdsZWFmbGV0LWNvbnRyb2wtbGF5ZXJzJyxcclxuXHRcdCAgICBjb250YWluZXIgPSB0aGlzLl9jb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCBjbGFzc05hbWUpO1xyXG5cclxuXHRcdC8vIG1ha2VzIHRoaXMgd29yayBvbiBJRSB0b3VjaCBkZXZpY2VzIGJ5IHN0b3BwaW5nIGl0IGZyb20gZmlyaW5nIGEgbW91c2VvdXQgZXZlbnQgd2hlbiB0aGUgdG91Y2ggaXMgcmVsZWFzZWRcclxuXHRcdGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGFzcG9wdXAnLCB0cnVlKTtcclxuXHJcblx0XHRMLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKGNvbnRhaW5lcik7XHJcblx0XHRpZiAoIUwuQnJvd3Nlci50b3VjaCkge1xyXG5cdFx0XHRMLkRvbUV2ZW50LmRpc2FibGVTY3JvbGxQcm9wYWdhdGlvbihjb250YWluZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBmb3JtID0gdGhpcy5fZm9ybSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2Zvcm0nLCBjbGFzc05hbWUgKyAnLWxpc3QnKTtcclxuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmNvbGxhcHNlZCkge1xyXG5cdFx0XHRpZiAoIUwuQnJvd3Nlci5hbmRyb2lkKSB7XHJcblx0XHRcdFx0TC5Eb21FdmVudC5vbihjb250YWluZXIsIHtcclxuXHRcdFx0XHRcdG1vdXNlZW50ZXI6IHRoaXMuX2V4cGFuZCxcclxuXHRcdFx0XHRcdG1vdXNlbGVhdmU6IHRoaXMuX2NvbGxhcHNlXHJcblx0XHRcdFx0fSwgdGhpcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBsaW5rID0gdGhpcy5fbGF5ZXJzTGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCBjbGFzc05hbWUgKyAnLXRvZ2dsZScsIGNvbnRhaW5lcik7XHJcblx0XHRcdGxpbmsuaHJlZiA9ICcjJztcclxuXHRcdFx0bGluay50aXRsZSA9ICdMYXllcnMnO1xyXG5cclxuXHRcdFx0aWYgKEwuQnJvd3Nlci50b3VjaCkge1xyXG5cdFx0XHRcdEwuRG9tRXZlbnRcclxuXHRcdFx0XHQgICAgLm9uKGxpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcClcclxuXHRcdFx0XHQgICAgLm9uKGxpbmssICdjbGljaycsIHRoaXMuX2V4cGFuZCwgdGhpcyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0TC5Eb21FdmVudC5vbihsaW5rLCAnZm9jdXMnLCB0aGlzLl9leHBhbmQsIHRoaXMpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyB3b3JrIGFyb3VuZCBmb3IgRmlyZWZveCBBbmRyb2lkIGlzc3VlIGh0dHBzOi8vZ2l0aHViLmNvbS9MZWFmbGV0L0xlYWZsZXQvaXNzdWVzLzIwMzNcclxuXHRcdFx0TC5Eb21FdmVudC5vbihmb3JtLCAnY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChMLmJpbmQodGhpcy5fb25JbnB1dENsaWNrLCB0aGlzKSwgMCk7XHJcblx0XHRcdH0sIHRoaXMpO1xyXG5cclxuXHRcdFx0dGhpcy5fbWFwLm9uKCdjbGljaycsIHRoaXMuX2NvbGxhcHNlLCB0aGlzKTtcclxuXHRcdFx0Ly8gVE9ETyBrZXlib2FyZCBhY2Nlc3NpYmlsaXR5XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLl9leHBhbmQoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl9iYXNlTGF5ZXJzTGlzdCA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSArICctYmFzZScsIGZvcm0pO1xyXG5cdFx0dGhpcy5fc2VwYXJhdG9yID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgY2xhc3NOYW1lICsgJy1zZXBhcmF0b3InLCBmb3JtKTtcclxuXHRcdHRoaXMuX292ZXJsYXlzTGlzdCA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSArICctb3ZlcmxheXMnLCBmb3JtKTtcclxuXHJcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoZm9ybSk7XHJcblx0fSxcclxuXHJcblx0X2FkZExheWVyOiBmdW5jdGlvbiAobGF5ZXIsIG5hbWUsIG92ZXJsYXkpIHtcclxuXHRcdGxheWVyLm9uKCdhZGQgcmVtb3ZlJywgdGhpcy5fb25MYXllckNoYW5nZSwgdGhpcyk7XHJcblxyXG5cdFx0dmFyIGlkID0gTC5zdGFtcChsYXllcik7XHJcblxyXG5cdFx0dGhpcy5fbGF5ZXJzW2lkXSA9IHtcclxuXHRcdFx0bGF5ZXI6IGxheWVyLFxyXG5cdFx0XHRuYW1lOiBuYW1lLFxyXG5cdFx0XHRvdmVybGF5OiBvdmVybGF5XHJcblx0XHR9O1xyXG5cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuYXV0b1pJbmRleCAmJiBsYXllci5zZXRaSW5kZXgpIHtcclxuXHRcdFx0dGhpcy5fbGFzdFpJbmRleCsrO1xyXG5cdFx0XHRsYXllci5zZXRaSW5kZXgodGhpcy5fbGFzdFpJbmRleCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0X3VwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKCF0aGlzLl9jb250YWluZXIpIHsgcmV0dXJuIHRoaXM7IH1cclxuXHJcblx0XHRMLkRvbVV0aWwuZW1wdHkodGhpcy5fYmFzZUxheWVyc0xpc3QpO1xyXG5cdFx0TC5Eb21VdGlsLmVtcHR5KHRoaXMuX292ZXJsYXlzTGlzdCk7XHJcblxyXG5cdFx0dmFyIGJhc2VMYXllcnNQcmVzZW50LCBvdmVybGF5c1ByZXNlbnQsIGksIG9iaiwgYmFzZUxheWVyc0NvdW50ID0gMDtcclxuXHJcblx0XHRmb3IgKGkgaW4gdGhpcy5fbGF5ZXJzKSB7XHJcblx0XHRcdG9iaiA9IHRoaXMuX2xheWVyc1tpXTtcclxuXHRcdFx0dGhpcy5fYWRkSXRlbShvYmopO1xyXG5cdFx0XHRvdmVybGF5c1ByZXNlbnQgPSBvdmVybGF5c1ByZXNlbnQgfHwgb2JqLm92ZXJsYXk7XHJcblx0XHRcdGJhc2VMYXllcnNQcmVzZW50ID0gYmFzZUxheWVyc1ByZXNlbnQgfHwgIW9iai5vdmVybGF5O1xyXG5cdFx0XHRiYXNlTGF5ZXJzQ291bnQgKz0gIW9iai5vdmVybGF5ID8gMSA6IDA7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGlkZSBiYXNlIGxheWVycyBzZWN0aW9uIGlmIHRoZXJlJ3Mgb25seSBvbmUgbGF5ZXIuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmhpZGVTaW5nbGVCYXNlKSB7XHJcblx0XHRcdGJhc2VMYXllcnNQcmVzZW50ID0gYmFzZUxheWVyc1ByZXNlbnQgJiYgYmFzZUxheWVyc0NvdW50ID4gMTtcclxuXHRcdFx0dGhpcy5fYmFzZUxheWVyc0xpc3Quc3R5bGUuZGlzcGxheSA9IGJhc2VMYXllcnNQcmVzZW50ID8gJycgOiAnbm9uZSc7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fc2VwYXJhdG9yLnN0eWxlLmRpc3BsYXkgPSBvdmVybGF5c1ByZXNlbnQgJiYgYmFzZUxheWVyc1ByZXNlbnQgPyAnJyA6ICdub25lJztcclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRfb25MYXllckNoYW5nZTogZnVuY3Rpb24gKGUpIHtcclxuXHRcdGlmICghdGhpcy5faGFuZGxpbmdDbGljaykge1xyXG5cdFx0XHR0aGlzLl91cGRhdGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb2JqID0gdGhpcy5fbGF5ZXJzW0wuc3RhbXAoZS50YXJnZXQpXTtcclxuXHJcblx0XHR2YXIgdHlwZSA9IG9iai5vdmVybGF5ID9cclxuXHRcdFx0KGUudHlwZSA9PT0gJ2FkZCcgPyAnb3ZlcmxheWFkZCcgOiAnb3ZlcmxheXJlbW92ZScpIDpcclxuXHRcdFx0KGUudHlwZSA9PT0gJ2FkZCcgPyAnYmFzZWxheWVyY2hhbmdlJyA6IG51bGwpO1xyXG5cclxuXHRcdGlmICh0eXBlKSB7XHJcblx0XHRcdHRoaXMuX21hcC5maXJlKHR5cGUsIG9iaik7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Ly8gSUU3IGJ1Z3Mgb3V0IGlmIHlvdSBjcmVhdGUgYSByYWRpbyBkeW5hbWljYWxseSwgc28geW91IGhhdmUgdG8gZG8gaXQgdGhpcyBoYWNreSB3YXkgKHNlZSBodHRwOi8vYml0Lmx5L1BxWUxCZSlcclxuXHRfY3JlYXRlUmFkaW9FbGVtZW50OiBmdW5jdGlvbiAobmFtZSwgY2hlY2tlZCkge1xyXG5cclxuXHRcdHZhciByYWRpb0h0bWwgPSAnPGlucHV0IHR5cGU9XCJyYWRpb1wiIGNsYXNzPVwibGVhZmxldC1jb250cm9sLWxheWVycy1zZWxlY3RvclwiIG5hbWU9XCInICtcclxuXHRcdFx0XHRuYW1lICsgJ1wiJyArIChjaGVja2VkID8gJyBjaGVja2VkPVwiY2hlY2tlZFwiJyA6ICcnKSArICcvPic7XHJcblxyXG5cdFx0dmFyIHJhZGlvRnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHRcdHJhZGlvRnJhZ21lbnQuaW5uZXJIVE1MID0gcmFkaW9IdG1sO1xyXG5cclxuXHRcdHJldHVybiByYWRpb0ZyYWdtZW50LmZpcnN0Q2hpbGQ7XHJcblx0fSxcclxuXHJcblx0X2FkZEl0ZW06IGZ1bmN0aW9uIChvYmopIHtcclxuXHRcdHZhciBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyksXHJcblx0XHQgICAgY2hlY2tlZCA9IHRoaXMuX21hcC5oYXNMYXllcihvYmoubGF5ZXIpLFxyXG5cdFx0ICAgIGlucHV0O1xyXG5cclxuXHRcdGlmIChvYmoub3ZlcmxheSkge1xyXG5cdFx0XHRpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcblx0XHRcdGlucHV0LnR5cGUgPSAnY2hlY2tib3gnO1xyXG5cdFx0XHRpbnB1dC5jbGFzc05hbWUgPSAnbGVhZmxldC1jb250cm9sLWxheWVycy1zZWxlY3Rvcic7XHJcblx0XHRcdGlucHV0LmRlZmF1bHRDaGVja2VkID0gY2hlY2tlZDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlucHV0ID0gdGhpcy5fY3JlYXRlUmFkaW9FbGVtZW50KCdsZWFmbGV0LWJhc2UtbGF5ZXJzJywgY2hlY2tlZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aW5wdXQubGF5ZXJJZCA9IEwuc3RhbXAob2JqLmxheWVyKTtcclxuXHJcblx0XHRMLkRvbUV2ZW50Lm9uKGlucHV0LCAnY2xpY2snLCB0aGlzLl9vbklucHV0Q2xpY2ssIHRoaXMpO1xyXG5cclxuXHRcdHZhciBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG5cdFx0bmFtZS5pbm5lckhUTUwgPSAnICcgKyBvYmoubmFtZTtcclxuXHJcblx0XHQvLyBIZWxwcyBmcm9tIHByZXZlbnRpbmcgbGF5ZXIgY29udHJvbCBmbGlja2VyIHdoZW4gY2hlY2tib3hlcyBhcmUgZGlzYWJsZWRcclxuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9MZWFmbGV0L0xlYWZsZXQvaXNzdWVzLzI3NzFcclxuXHRcdHZhciBob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHJcblx0XHRsYWJlbC5hcHBlbmRDaGlsZChob2xkZXIpO1xyXG5cdFx0aG9sZGVyLmFwcGVuZENoaWxkKGlucHV0KTtcclxuXHRcdGhvbGRlci5hcHBlbmRDaGlsZChuYW1lKTtcclxuXHJcblx0XHR2YXIgY29udGFpbmVyID0gb2JqLm92ZXJsYXkgPyB0aGlzLl9vdmVybGF5c0xpc3QgOiB0aGlzLl9iYXNlTGF5ZXJzTGlzdDtcclxuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbCk7XHJcblxyXG5cdFx0dGhpcy5fY2hlY2tEaXNhYmxlZExheWVycygpO1xyXG5cdFx0cmV0dXJuIGxhYmVsO1xyXG5cdH0sXHJcblxyXG5cdF9vbklucHV0Q2xpY2s6IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBpbnB1dHMgPSB0aGlzLl9mb3JtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbnB1dCcpLFxyXG5cdFx0ICAgIGlucHV0LCBsYXllciwgaGFzTGF5ZXI7XHJcblx0XHR2YXIgYWRkZWRMYXllcnMgPSBbXSxcclxuXHRcdCAgICByZW1vdmVkTGF5ZXJzID0gW107XHJcblxyXG5cdFx0dGhpcy5faGFuZGxpbmdDbGljayA9IHRydWU7XHJcblxyXG5cdFx0Zm9yICh2YXIgaSA9IGlucHV0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRpbnB1dCA9IGlucHV0c1tpXTtcclxuXHRcdFx0bGF5ZXIgPSB0aGlzLl9sYXllcnNbaW5wdXQubGF5ZXJJZF0ubGF5ZXI7XHJcblx0XHRcdGhhc0xheWVyID0gdGhpcy5fbWFwLmhhc0xheWVyKGxheWVyKTtcclxuXHJcblx0XHRcdGlmIChpbnB1dC5jaGVja2VkICYmICFoYXNMYXllcikge1xyXG5cdFx0XHRcdGFkZGVkTGF5ZXJzLnB1c2gobGF5ZXIpO1xyXG5cclxuXHRcdFx0fSBlbHNlIGlmICghaW5wdXQuY2hlY2tlZCAmJiBoYXNMYXllcikge1xyXG5cdFx0XHRcdHJlbW92ZWRMYXllcnMucHVzaChsYXllcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBCdWdmaXggaXNzdWUgMjMxODogU2hvdWxkIHJlbW92ZSBhbGwgb2xkIGxheWVycyBiZWZvcmUgcmVhZGRpbmcgbmV3IG9uZXNcclxuXHRcdGZvciAoaSA9IDA7IGkgPCByZW1vdmVkTGF5ZXJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMuX21hcC5yZW1vdmVMYXllcihyZW1vdmVkTGF5ZXJzW2ldKTtcclxuXHRcdH1cclxuXHRcdGZvciAoaSA9IDA7IGkgPCBhZGRlZExheWVycy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR0aGlzLl9tYXAuYWRkTGF5ZXIoYWRkZWRMYXllcnNbaV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX2hhbmRsaW5nQ2xpY2sgPSBmYWxzZTtcclxuXHJcblx0XHR0aGlzLl9yZWZvY3VzT25NYXAoKTtcclxuXHR9LFxyXG5cclxuXHRfZXhwYW5kOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1jb250cm9sLWxheWVycy1leHBhbmRlZCcpO1xyXG5cdFx0dGhpcy5fZm9ybS5zdHlsZS5oZWlnaHQgPSBudWxsO1xyXG5cdFx0dmFyIGFjY2VwdGFibGVIZWlnaHQgPSB0aGlzLl9tYXAuX3NpemUueSAtICh0aGlzLl9jb250YWluZXIub2Zmc2V0VG9wICsgNTApO1xyXG5cdFx0aWYgKGFjY2VwdGFibGVIZWlnaHQgPCB0aGlzLl9mb3JtLmNsaWVudEhlaWdodCkge1xyXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fZm9ybSwgJ2xlYWZsZXQtY29udHJvbC1sYXllcnMtc2Nyb2xsYmFyJyk7XHJcblx0XHRcdHRoaXMuX2Zvcm0uc3R5bGUuaGVpZ2h0ID0gYWNjZXB0YWJsZUhlaWdodCArICdweCc7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fZm9ybSwgJ2xlYWZsZXQtY29udHJvbC1sYXllcnMtc2Nyb2xsYmFyJyk7XHJcblx0XHR9XHJcblx0XHR0aGlzLl9jaGVja0Rpc2FibGVkTGF5ZXJzKCk7XHJcblx0fSxcclxuXHJcblx0X2NvbGxhcHNlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1jb250cm9sLWxheWVycy1leHBhbmRlZCcpO1xyXG5cdH0sXHJcblxyXG5cdF9jaGVja0Rpc2FibGVkTGF5ZXJzOiBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgaW5wdXRzID0gdGhpcy5fZm9ybS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW5wdXQnKSxcclxuXHRcdCAgICBpbnB1dCxcclxuXHRcdCAgICBsYXllcixcclxuXHRcdCAgICB6b29tID0gdGhpcy5fbWFwLmdldFpvb20oKTtcclxuXHJcblx0XHRmb3IgKHZhciBpID0gaW5wdXRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdGlucHV0ID0gaW5wdXRzW2ldO1xyXG5cdFx0XHRsYXllciA9IHRoaXMuX2xheWVyc1tpbnB1dC5sYXllcklkXS5sYXllcjtcclxuXHRcdFx0aW5wdXQuZGlzYWJsZWQgPSAobGF5ZXIub3B0aW9ucy5taW5ab29tICE9PSB1bmRlZmluZWQgJiYgem9vbSA8IGxheWVyLm9wdGlvbnMubWluWm9vbSkgfHxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICAobGF5ZXIub3B0aW9ucy5tYXhab29tICE9PSB1bmRlZmluZWQgJiYgem9vbSA+IGxheWVyLm9wdGlvbnMubWF4Wm9vbSk7XHJcblxyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5MLmNvbnRyb2wubGF5ZXJzID0gZnVuY3Rpb24gKGJhc2VMYXllcnMsIG92ZXJsYXlzLCBvcHRpb25zKSB7XHJcblx0cmV0dXJuIG5ldyBMLkNvbnRyb2wuTGF5ZXJzKGJhc2VMYXllcnMsIG92ZXJsYXlzLCBvcHRpb25zKTtcclxufTtcclxuXG5cblxuLypcbiAqIEwuUG9zQW5pbWF0aW9uIHBvd2VycyBMZWFmbGV0IHBhbiBhbmltYXRpb25zIGludGVybmFsbHkuXG4gKi9cblxuTC5Qb3NBbmltYXRpb24gPSBMLkV2ZW50ZWQuZXh0ZW5kKHtcblxuXHRydW46IGZ1bmN0aW9uIChlbCwgbmV3UG9zLCBkdXJhdGlvbiwgZWFzZUxpbmVhcml0eSkgeyAvLyAoSFRNTEVsZW1lbnQsIFBvaW50WywgTnVtYmVyLCBOdW1iZXJdKVxuXHRcdHRoaXMuc3RvcCgpO1xuXG5cdFx0dGhpcy5fZWwgPSBlbDtcblx0XHR0aGlzLl9pblByb2dyZXNzID0gdHJ1ZTtcblx0XHR0aGlzLl9kdXJhdGlvbiA9IGR1cmF0aW9uIHx8IDAuMjU7XG5cdFx0dGhpcy5fZWFzZU91dFBvd2VyID0gMSAvIE1hdGgubWF4KGVhc2VMaW5lYXJpdHkgfHwgMC41LCAwLjIpO1xuXG5cdFx0dGhpcy5fc3RhcnRQb3MgPSBMLkRvbVV0aWwuZ2V0UG9zaXRpb24oZWwpO1xuXHRcdHRoaXMuX29mZnNldCA9IG5ld1Bvcy5zdWJ0cmFjdCh0aGlzLl9zdGFydFBvcyk7XG5cdFx0dGhpcy5fc3RhcnRUaW1lID0gK25ldyBEYXRlKCk7XG5cblx0XHR0aGlzLmZpcmUoJ3N0YXJ0Jyk7XG5cblx0XHR0aGlzLl9hbmltYXRlKCk7XG5cdH0sXG5cblx0c3RvcDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5faW5Qcm9ncmVzcykgeyByZXR1cm47IH1cblxuXHRcdHRoaXMuX3N0ZXAodHJ1ZSk7XG5cdFx0dGhpcy5fY29tcGxldGUoKTtcblx0fSxcblxuXHRfYW5pbWF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGFuaW1hdGlvbiBsb29wXG5cdFx0dGhpcy5fYW5pbUlkID0gTC5VdGlsLnJlcXVlc3RBbmltRnJhbWUodGhpcy5fYW5pbWF0ZSwgdGhpcyk7XG5cdFx0dGhpcy5fc3RlcCgpO1xuXHR9LFxuXG5cdF9zdGVwOiBmdW5jdGlvbiAocm91bmQpIHtcblx0XHR2YXIgZWxhcHNlZCA9ICgrbmV3IERhdGUoKSkgLSB0aGlzLl9zdGFydFRpbWUsXG5cdFx0ICAgIGR1cmF0aW9uID0gdGhpcy5fZHVyYXRpb24gKiAxMDAwO1xuXG5cdFx0aWYgKGVsYXBzZWQgPCBkdXJhdGlvbikge1xuXHRcdFx0dGhpcy5fcnVuRnJhbWUodGhpcy5fZWFzZU91dChlbGFwc2VkIC8gZHVyYXRpb24pLCByb3VuZCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3J1bkZyYW1lKDEpO1xuXHRcdFx0dGhpcy5fY29tcGxldGUoKTtcblx0XHR9XG5cdH0sXG5cblx0X3J1bkZyYW1lOiBmdW5jdGlvbiAocHJvZ3Jlc3MsIHJvdW5kKSB7XG5cdFx0dmFyIHBvcyA9IHRoaXMuX3N0YXJ0UG9zLmFkZCh0aGlzLl9vZmZzZXQubXVsdGlwbHlCeShwcm9ncmVzcykpO1xuXHRcdGlmIChyb3VuZCkge1xuXHRcdFx0cG9zLl9yb3VuZCgpO1xuXHRcdH1cblx0XHRMLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fZWwsIHBvcyk7XG5cblx0XHR0aGlzLmZpcmUoJ3N0ZXAnKTtcblx0fSxcblxuXHRfY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0XHRMLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1JZCk7XG5cblx0XHR0aGlzLl9pblByb2dyZXNzID0gZmFsc2U7XG5cdFx0dGhpcy5maXJlKCdlbmQnKTtcblx0fSxcblxuXHRfZWFzZU91dDogZnVuY3Rpb24gKHQpIHtcblx0XHRyZXR1cm4gMSAtIE1hdGgucG93KDEgLSB0LCB0aGlzLl9lYXNlT3V0UG93ZXIpO1xuXHR9XG59KTtcblxuXG5cbi8qXG4gKiBFeHRlbmRzIEwuTWFwIHRvIGhhbmRsZSBwYW5uaW5nIGFuaW1hdGlvbnMuXG4gKi9cblxuTC5NYXAuaW5jbHVkZSh7XG5cblx0c2V0VmlldzogZnVuY3Rpb24gKGNlbnRlciwgem9vbSwgb3B0aW9ucykge1xuXG5cdFx0em9vbSA9IHpvb20gPT09IHVuZGVmaW5lZCA/IHRoaXMuX3pvb20gOiB0aGlzLl9saW1pdFpvb20oem9vbSk7XG5cdFx0Y2VudGVyID0gdGhpcy5fbGltaXRDZW50ZXIoTC5sYXRMbmcoY2VudGVyKSwgem9vbSwgdGhpcy5vcHRpb25zLm1heEJvdW5kcyk7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHR0aGlzLnN0b3AoKTtcblxuXHRcdGlmICh0aGlzLl9sb2FkZWQgJiYgIW9wdGlvbnMucmVzZXQgJiYgb3B0aW9ucyAhPT0gdHJ1ZSkge1xuXG5cdFx0XHRpZiAob3B0aW9ucy5hbmltYXRlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0b3B0aW9ucy56b29tID0gTC5leHRlbmQoe2FuaW1hdGU6IG9wdGlvbnMuYW5pbWF0ZX0sIG9wdGlvbnMuem9vbSk7XG5cdFx0XHRcdG9wdGlvbnMucGFuID0gTC5leHRlbmQoe2FuaW1hdGU6IG9wdGlvbnMuYW5pbWF0ZSwgZHVyYXRpb246IG9wdGlvbnMuZHVyYXRpb259LCBvcHRpb25zLnBhbik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRyeSBhbmltYXRpbmcgcGFuIG9yIHpvb21cblx0XHRcdHZhciBtb3ZlZCA9ICh0aGlzLl96b29tICE9PSB6b29tKSA/XG5cdFx0XHRcdHRoaXMuX3RyeUFuaW1hdGVkWm9vbSAmJiB0aGlzLl90cnlBbmltYXRlZFpvb20oY2VudGVyLCB6b29tLCBvcHRpb25zLnpvb20pIDpcblx0XHRcdFx0dGhpcy5fdHJ5QW5pbWF0ZWRQYW4oY2VudGVyLCBvcHRpb25zLnBhbik7XG5cblx0XHRcdGlmIChtb3ZlZCkge1xuXHRcdFx0XHQvLyBwcmV2ZW50IHJlc2l6ZSBoYW5kbGVyIGNhbGwsIHRoZSB2aWV3IHdpbGwgcmVmcmVzaCBhZnRlciBhbmltYXRpb24gYW55d2F5XG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLl9zaXplVGltZXIpO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBhbmltYXRpb24gZGlkbid0IHN0YXJ0LCBqdXN0IHJlc2V0IHRoZSBtYXAgdmlld1xuXHRcdHRoaXMuX3Jlc2V0VmlldyhjZW50ZXIsIHpvb20pO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0cGFuQnk6IGZ1bmN0aW9uIChvZmZzZXQsIG9wdGlvbnMpIHtcblx0XHRvZmZzZXQgPSBMLnBvaW50KG9mZnNldCkucm91bmQoKTtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdGlmICghb2Zmc2V0LnggJiYgIW9mZnNldC55KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5maXJlKCdtb3ZlZW5kJyk7XG5cdFx0fVxuXHRcdC8vIElmIHdlIHBhbiB0b28gZmFyLCBDaHJvbWUgZ2V0cyBpc3N1ZXMgd2l0aCB0aWxlc1xuXHRcdC8vIGFuZCBtYWtlcyB0aGVtIGRpc2FwcGVhciBvciBhcHBlYXIgaW4gdGhlIHdyb25nIHBsYWNlIChzbGlnaHRseSBvZmZzZXQpICMyNjAyXG5cdFx0aWYgKG9wdGlvbnMuYW5pbWF0ZSAhPT0gdHJ1ZSAmJiAhdGhpcy5nZXRTaXplKCkuY29udGFpbnMob2Zmc2V0KSkge1xuXHRcdFx0dGhpcy5fcmVzZXRWaWV3KHRoaXMudW5wcm9qZWN0KHRoaXMucHJvamVjdCh0aGlzLmdldENlbnRlcigpKS5hZGQob2Zmc2V0KSksIHRoaXMuZ2V0Wm9vbSgpKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdGlmICghdGhpcy5fcGFuQW5pbSkge1xuXHRcdFx0dGhpcy5fcGFuQW5pbSA9IG5ldyBMLlBvc0FuaW1hdGlvbigpO1xuXG5cdFx0XHR0aGlzLl9wYW5BbmltLm9uKHtcblx0XHRcdFx0J3N0ZXAnOiB0aGlzLl9vblBhblRyYW5zaXRpb25TdGVwLFxuXHRcdFx0XHQnZW5kJzogdGhpcy5fb25QYW5UcmFuc2l0aW9uRW5kXG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9XG5cblx0XHQvLyBkb24ndCBmaXJlIG1vdmVzdGFydCBpZiBhbmltYXRpbmcgaW5lcnRpYVxuXHRcdGlmICghb3B0aW9ucy5ub01vdmVTdGFydCkge1xuXHRcdFx0dGhpcy5maXJlKCdtb3Zlc3RhcnQnKTtcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHBhbiB1bmxlc3MgYW5pbWF0ZTogZmFsc2Ugc3BlY2lmaWVkXG5cdFx0aWYgKG9wdGlvbnMuYW5pbWF0ZSAhPT0gZmFsc2UpIHtcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9tYXBQYW5lLCAnbGVhZmxldC1wYW4tYW5pbScpO1xuXG5cdFx0XHR2YXIgbmV3UG9zID0gdGhpcy5fZ2V0TWFwUGFuZVBvcygpLnN1YnRyYWN0KG9mZnNldCk7XG5cdFx0XHR0aGlzLl9wYW5BbmltLnJ1bih0aGlzLl9tYXBQYW5lLCBuZXdQb3MsIG9wdGlvbnMuZHVyYXRpb24gfHwgMC4yNSwgb3B0aW9ucy5lYXNlTGluZWFyaXR5KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fcmF3UGFuQnkob2Zmc2V0KTtcblx0XHRcdHRoaXMuZmlyZSgnbW92ZScpLmZpcmUoJ21vdmVlbmQnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfb25QYW5UcmFuc2l0aW9uU3RlcDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuZmlyZSgnbW92ZScpO1xuXHR9LFxuXG5cdF9vblBhblRyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uICgpIHtcblx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fbWFwUGFuZSwgJ2xlYWZsZXQtcGFuLWFuaW0nKTtcblx0XHR0aGlzLmZpcmUoJ21vdmVlbmQnKTtcblx0fSxcblxuXHRfdHJ5QW5pbWF0ZWRQYW46IGZ1bmN0aW9uIChjZW50ZXIsIG9wdGlvbnMpIHtcblx0XHQvLyBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIG5ldyBhbmQgY3VycmVudCBjZW50ZXJzIGluIHBpeGVsc1xuXHRcdHZhciBvZmZzZXQgPSB0aGlzLl9nZXRDZW50ZXJPZmZzZXQoY2VudGVyKS5fZmxvb3IoKTtcblxuXHRcdC8vIGRvbid0IGFuaW1hdGUgdG9vIGZhciB1bmxlc3MgYW5pbWF0ZTogdHJ1ZSBzcGVjaWZpZWQgaW4gb3B0aW9uc1xuXHRcdGlmICgob3B0aW9ucyAmJiBvcHRpb25zLmFuaW1hdGUpICE9PSB0cnVlICYmICF0aGlzLmdldFNpemUoKS5jb250YWlucyhvZmZzZXQpKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdFx0dGhpcy5wYW5CeShvZmZzZXQsIG9wdGlvbnMpO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn0pO1xuXG5cblxuLypcbiAqIEV4dGVuZHMgTC5NYXAgdG8gaGFuZGxlIHpvb20gYW5pbWF0aW9ucy5cbiAqL1xuXG5MLk1hcC5tZXJnZU9wdGlvbnMoe1xuXHR6b29tQW5pbWF0aW9uOiB0cnVlLFxuXHR6b29tQW5pbWF0aW9uVGhyZXNob2xkOiA0XG59KTtcblxudmFyIHpvb21BbmltYXRlZCA9IEwuRG9tVXRpbC5UUkFOU0lUSU9OICYmIEwuQnJvd3Nlci5hbnkzZCAmJiAhTC5Ccm93c2VyLm1vYmlsZU9wZXJhO1xuXG5pZiAoem9vbUFuaW1hdGVkKSB7XG5cblx0TC5NYXAuYWRkSW5pdEhvb2soZnVuY3Rpb24gKCkge1xuXHRcdC8vIGRvbid0IGFuaW1hdGUgb24gYnJvd3NlcnMgd2l0aG91dCBoYXJkd2FyZS1hY2NlbGVyYXRlZCB0cmFuc2l0aW9ucyBvciBvbGQgQW5kcm9pZC9PcGVyYVxuXHRcdHRoaXMuX3pvb21BbmltYXRlZCA9IHRoaXMub3B0aW9ucy56b29tQW5pbWF0aW9uO1xuXG5cdFx0Ly8gem9vbSB0cmFuc2l0aW9ucyBydW4gd2l0aCB0aGUgc2FtZSBkdXJhdGlvbiBmb3IgYWxsIGxheWVycywgc28gaWYgb25lIG9mIHRyYW5zaXRpb25lbmQgZXZlbnRzXG5cdFx0Ly8gaGFwcGVucyBhZnRlciBzdGFydGluZyB6b29tIGFuaW1hdGlvbiAocHJvcGFnYXRpbmcgdG8gdGhlIG1hcCBwYW5lKSwgd2Uga25vdyB0aGF0IGl0IGVuZGVkIGdsb2JhbGx5XG5cdFx0aWYgKHRoaXMuX3pvb21BbmltYXRlZCkge1xuXG5cdFx0XHR0aGlzLl9jcmVhdGVBbmltUHJveHkoKTtcblxuXHRcdFx0TC5Eb21FdmVudC5vbih0aGlzLl9wcm94eSwgTC5Eb21VdGlsLlRSQU5TSVRJT05fRU5ELCB0aGlzLl9jYXRjaFRyYW5zaXRpb25FbmQsIHRoaXMpO1xuXHRcdH1cblx0fSk7XG59XG5cbkwuTWFwLmluY2x1ZGUoIXpvb21BbmltYXRlZCA/IHt9IDoge1xuXG5cdF9jcmVhdGVBbmltUHJveHk6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBwcm94eSA9IHRoaXMuX3Byb3h5ID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtcHJveHkgbGVhZmxldC16b29tLWFuaW1hdGVkJyk7XG5cdFx0dGhpcy5fcGFuZXMubWFwUGFuZS5hcHBlbmRDaGlsZChwcm94eSk7XG5cblx0XHR0aGlzLm9uKCd6b29tYW5pbScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgcHJvcCA9IEwuRG9tVXRpbC5UUkFOU0ZPUk0sXG5cdFx0XHQgICAgdHJhbnNmb3JtID0gcHJveHkuc3R5bGVbcHJvcF07XG5cblx0XHRcdEwuRG9tVXRpbC5zZXRUcmFuc2Zvcm0ocHJveHksIHRoaXMucHJvamVjdChlLmNlbnRlciwgZS56b29tKSwgdGhpcy5nZXRab29tU2NhbGUoZS56b29tLCAxKSk7XG5cblx0XHRcdC8vIHdvcmthcm91bmQgZm9yIGNhc2Ugd2hlbiB0cmFuc2Zvcm0gaXMgdGhlIHNhbWUgYW5kIHNvIHRyYW5zaXRpb25lbmQgZXZlbnQgaXMgbm90IGZpcmVkXG5cdFx0XHRpZiAodHJhbnNmb3JtID09PSBwcm94eS5zdHlsZVtwcm9wXSAmJiB0aGlzLl9hbmltYXRpbmdab29tKSB7XG5cdFx0XHRcdHRoaXMuX29uWm9vbVRyYW5zaXRpb25FbmQoKTtcblx0XHRcdH1cblx0XHR9LCB0aGlzKTtcblxuXHRcdHRoaXMub24oJ2xvYWQgbW92ZWVuZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBjID0gdGhpcy5nZXRDZW50ZXIoKSxcblx0XHRcdCAgICB6ID0gdGhpcy5nZXRab29tKCk7XG5cdFx0XHRMLkRvbVV0aWwuc2V0VHJhbnNmb3JtKHByb3h5LCB0aGlzLnByb2plY3QoYywgeiksIHRoaXMuZ2V0Wm9vbVNjYWxlKHosIDEpKTtcblx0XHR9LCB0aGlzKTtcblx0fSxcblxuXHRfY2F0Y2hUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiAoZSkge1xuXHRcdGlmICh0aGlzLl9hbmltYXRpbmdab29tICYmIGUucHJvcGVydHlOYW1lLmluZGV4T2YoJ3RyYW5zZm9ybScpID49IDApIHtcblx0XHRcdHRoaXMuX29uWm9vbVRyYW5zaXRpb25FbmQoKTtcblx0XHR9XG5cdH0sXG5cblx0X25vdGhpbmdUb0FuaW1hdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gIXRoaXMuX2NvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsZWFmbGV0LXpvb20tYW5pbWF0ZWQnKS5sZW5ndGg7XG5cdH0sXG5cblx0X3RyeUFuaW1hdGVkWm9vbTogZnVuY3Rpb24gKGNlbnRlciwgem9vbSwgb3B0aW9ucykge1xuXG5cdFx0aWYgKHRoaXMuX2FuaW1hdGluZ1pvb20pIHsgcmV0dXJuIHRydWU7IH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0Ly8gZG9uJ3QgYW5pbWF0ZSBpZiBkaXNhYmxlZCwgbm90IHN1cHBvcnRlZCBvciB6b29tIGRpZmZlcmVuY2UgaXMgdG9vIGxhcmdlXG5cdFx0aWYgKCF0aGlzLl96b29tQW5pbWF0ZWQgfHwgb3B0aW9ucy5hbmltYXRlID09PSBmYWxzZSB8fCB0aGlzLl9ub3RoaW5nVG9BbmltYXRlKCkgfHxcblx0XHQgICAgICAgIE1hdGguYWJzKHpvb20gLSB0aGlzLl96b29tKSA+IHRoaXMub3B0aW9ucy56b29tQW5pbWF0aW9uVGhyZXNob2xkKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdFx0Ly8gb2Zmc2V0IGlzIHRoZSBwaXhlbCBjb29yZHMgb2YgdGhlIHpvb20gb3JpZ2luIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IGNlbnRlclxuXHRcdHZhciBzY2FsZSA9IHRoaXMuZ2V0Wm9vbVNjYWxlKHpvb20pLFxuXHRcdCAgICBvZmZzZXQgPSB0aGlzLl9nZXRDZW50ZXJPZmZzZXQoY2VudGVyKS5fZGl2aWRlQnkoMSAtIDEgLyBzY2FsZSk7XG5cblx0XHQvLyBkb24ndCBhbmltYXRlIGlmIHRoZSB6b29tIG9yaWdpbiBpc24ndCB3aXRoaW4gb25lIHNjcmVlbiBmcm9tIHRoZSBjdXJyZW50IGNlbnRlciwgdW5sZXNzIGZvcmNlZFxuXHRcdGlmIChvcHRpb25zLmFuaW1hdGUgIT09IHRydWUgJiYgIXRoaXMuZ2V0U2l6ZSgpLmNvbnRhaW5zKG9mZnNldCkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0XHRMLlV0aWwucmVxdWVzdEFuaW1GcmFtZShmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGlzXG5cdFx0XHQgICAgLl9tb3ZlU3RhcnQodHJ1ZSlcblx0XHRcdCAgICAuX2FuaW1hdGVab29tKGNlbnRlciwgem9vbSwgdHJ1ZSk7XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRfYW5pbWF0ZVpvb206IGZ1bmN0aW9uIChjZW50ZXIsIHpvb20sIHN0YXJ0QW5pbSwgbm9VcGRhdGUpIHtcblx0XHRpZiAoc3RhcnRBbmltKSB7XG5cdFx0XHR0aGlzLl9hbmltYXRpbmdab29tID0gdHJ1ZTtcblxuXHRcdFx0Ly8gcmVtZW1iZXIgd2hhdCBjZW50ZXIvem9vbSB0byBzZXQgYWZ0ZXIgYW5pbWF0aW9uXG5cdFx0XHR0aGlzLl9hbmltYXRlVG9DZW50ZXIgPSBjZW50ZXI7XG5cdFx0XHR0aGlzLl9hbmltYXRlVG9ab29tID0gem9vbTtcblxuXHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX21hcFBhbmUsICdsZWFmbGV0LXpvb20tYW5pbScpO1xuXHRcdH1cblxuXHRcdHRoaXMuZmlyZSgnem9vbWFuaW0nLCB7XG5cdFx0XHRjZW50ZXI6IGNlbnRlcixcblx0XHRcdHpvb206IHpvb20sXG5cdFx0XHRub1VwZGF0ZTogbm9VcGRhdGVcblx0XHR9KTtcblxuXHRcdC8vIFdvcmsgYXJvdW5kIHdlYmtpdCBub3QgZmlyaW5nICd0cmFuc2l0aW9uZW5kJywgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9MZWFmbGV0L0xlYWZsZXQvaXNzdWVzLzM2ODksIDI2OTNcblx0XHRzZXRUaW1lb3V0KEwuYmluZCh0aGlzLl9vblpvb21UcmFuc2l0aW9uRW5kLCB0aGlzKSwgMjUwKTtcblx0fSxcblxuXHRfb25ab29tVHJhbnNpdGlvbkVuZDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5fYW5pbWF0aW5nWm9vbSkgeyByZXR1cm47IH1cblxuXHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl9tYXBQYW5lLCAnbGVhZmxldC16b29tLWFuaW0nKTtcblxuXHRcdC8vIFRoaXMgYW5pbSBmcmFtZSBzaG91bGQgcHJldmVudCBhbiBvYnNjdXJlIGlPUyB3ZWJraXQgdGlsZSBsb2FkaW5nIHJhY2UgY29uZGl0aW9uLlxuXHRcdEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuX2FuaW1hdGluZ1pvb20gPSBmYWxzZTtcblxuXHRcdFx0dGhpc1xuXHRcdFx0XHQuX21vdmUodGhpcy5fYW5pbWF0ZVRvQ2VudGVyLCB0aGlzLl9hbmltYXRlVG9ab29tKVxuXHRcdFx0XHQuX21vdmVFbmQodHJ1ZSk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cbn0pO1xuXG5cblxuXG5MLk1hcC5pbmNsdWRlKHtcblx0Zmx5VG86IGZ1bmN0aW9uICh0YXJnZXRDZW50ZXIsIHRhcmdldFpvb20sIG9wdGlvbnMpIHtcblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdGlmIChvcHRpb25zLmFuaW1hdGUgPT09IGZhbHNlIHx8ICFMLkJyb3dzZXIuYW55M2QpIHtcblx0XHRcdHJldHVybiB0aGlzLnNldFZpZXcodGFyZ2V0Q2VudGVyLCB0YXJnZXRab29tLCBvcHRpb25zKTtcblx0XHR9XG5cblx0XHR0aGlzLnN0b3AoKTtcblxuXHRcdHZhciBmcm9tID0gdGhpcy5wcm9qZWN0KHRoaXMuZ2V0Q2VudGVyKCkpLFxuXHRcdCAgICB0byA9IHRoaXMucHJvamVjdCh0YXJnZXRDZW50ZXIpLFxuXHRcdCAgICBzaXplID0gdGhpcy5nZXRTaXplKCksXG5cdFx0ICAgIHN0YXJ0Wm9vbSA9IHRoaXMuX3pvb207XG5cblx0XHR0YXJnZXRDZW50ZXIgPSBMLmxhdExuZyh0YXJnZXRDZW50ZXIpO1xuXHRcdHRhcmdldFpvb20gPSB0YXJnZXRab29tID09PSB1bmRlZmluZWQgPyBzdGFydFpvb20gOiB0YXJnZXRab29tO1xuXG5cdFx0dmFyIHcwID0gTWF0aC5tYXgoc2l6ZS54LCBzaXplLnkpLFxuXHRcdCAgICB3MSA9IHcwICogdGhpcy5nZXRab29tU2NhbGUoc3RhcnRab29tLCB0YXJnZXRab29tKSxcblx0XHQgICAgdTEgPSAodG8uZGlzdGFuY2VUbyhmcm9tKSkgfHwgMSxcblx0XHQgICAgcmhvID0gMS40Mixcblx0XHQgICAgcmhvMiA9IHJobyAqIHJobztcblxuXHRcdGZ1bmN0aW9uIHIoaSkge1xuXHRcdFx0dmFyIGIgPSAodzEgKiB3MSAtIHcwICogdzAgKyAoaSA/IC0xIDogMSkgKiByaG8yICogcmhvMiAqIHUxICogdTEpIC8gKDIgKiAoaSA/IHcxIDogdzApICogcmhvMiAqIHUxKTtcblx0XHRcdHJldHVybiBNYXRoLmxvZyhNYXRoLnNxcnQoYiAqIGIgKyAxKSAtIGIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNpbmgobikgeyByZXR1cm4gKE1hdGguZXhwKG4pIC0gTWF0aC5leHAoLW4pKSAvIDI7IH1cblx0XHRmdW5jdGlvbiBjb3NoKG4pIHsgcmV0dXJuIChNYXRoLmV4cChuKSArIE1hdGguZXhwKC1uKSkgLyAyOyB9XG5cdFx0ZnVuY3Rpb24gdGFuaChuKSB7IHJldHVybiBzaW5oKG4pIC8gY29zaChuKTsgfVxuXG5cdFx0dmFyIHIwID0gcigwKTtcblxuXHRcdGZ1bmN0aW9uIHcocykgeyByZXR1cm4gdzAgKiAoY29zaChyMCkgLyBjb3NoKHIwICsgcmhvICogcykpOyB9XG5cdFx0ZnVuY3Rpb24gdShzKSB7IHJldHVybiB3MCAqIChjb3NoKHIwKSAqIHRhbmgocjAgKyByaG8gKiBzKSAtIHNpbmgocjApKSAvIHJobzI7IH1cblxuXHRcdGZ1bmN0aW9uIGVhc2VPdXQodCkgeyByZXR1cm4gMSAtIE1hdGgucG93KDEgLSB0LCAxLjUpOyB9XG5cblx0XHR2YXIgc3RhcnQgPSBEYXRlLm5vdygpLFxuXHRcdCAgICBTID0gKHIoMSkgLSByMCkgLyByaG8sXG5cdFx0ICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiA/IDEwMDAgKiBvcHRpb25zLmR1cmF0aW9uIDogMTAwMCAqIFMgKiAwLjg7XG5cblx0XHRmdW5jdGlvbiBmcmFtZSgpIHtcblx0XHRcdHZhciB0ID0gKERhdGUubm93KCkgLSBzdGFydCkgLyBkdXJhdGlvbixcblx0XHRcdCAgICBzID0gZWFzZU91dCh0KSAqIFM7XG5cblx0XHRcdGlmICh0IDw9IDEpIHtcblx0XHRcdFx0dGhpcy5fZmx5VG9GcmFtZSA9IEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKGZyYW1lLCB0aGlzKTtcblxuXHRcdFx0XHR0aGlzLl9tb3ZlKFxuXHRcdFx0XHRcdHRoaXMudW5wcm9qZWN0KGZyb20uYWRkKHRvLnN1YnRyYWN0KGZyb20pLm11bHRpcGx5QnkodShzKSAvIHUxKSksIHN0YXJ0Wm9vbSksXG5cdFx0XHRcdFx0dGhpcy5nZXRTY2FsZVpvb20odzAgLyB3KHMpLCBzdGFydFpvb20pLFxuXHRcdFx0XHRcdHtmbHlUbzogdHJ1ZX0pO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0Ll9tb3ZlKHRhcmdldENlbnRlciwgdGFyZ2V0Wm9vbSlcblx0XHRcdFx0XHQuX21vdmVFbmQodHJ1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fbW92ZVN0YXJ0KHRydWUpO1xuXG5cdFx0ZnJhbWUuY2FsbCh0aGlzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmbHlUb0JvdW5kczogZnVuY3Rpb24gKGJvdW5kcywgb3B0aW9ucykge1xuXHRcdHZhciB0YXJnZXQgPSB0aGlzLl9nZXRCb3VuZHNDZW50ZXJab29tKGJvdW5kcywgb3B0aW9ucyk7XG5cdFx0cmV0dXJuIHRoaXMuZmx5VG8odGFyZ2V0LmNlbnRlciwgdGFyZ2V0Lnpvb20sIG9wdGlvbnMpO1xuXHR9XG59KTtcblxuXG5cbi8qXHJcbiAqIFByb3ZpZGVzIEwuTWFwIHdpdGggY29udmVuaWVudCBzaG9ydGN1dHMgZm9yIHVzaW5nIGJyb3dzZXIgZ2VvbG9jYXRpb24gZmVhdHVyZXMuXHJcbiAqL1xyXG5cclxuTC5NYXAuaW5jbHVkZSh7XHJcblx0X2RlZmF1bHRMb2NhdGVPcHRpb25zOiB7XHJcblx0XHR0aW1lb3V0OiAxMDAwMCxcclxuXHRcdHdhdGNoOiBmYWxzZVxyXG5cdFx0Ly8gc2V0VmlldzogZmFsc2VcclxuXHRcdC8vIG1heFpvb206IDxOdW1iZXI+XHJcblx0XHQvLyBtYXhpbXVtQWdlOiAwXHJcblx0XHQvLyBlbmFibGVIaWdoQWNjdXJhY3k6IGZhbHNlXHJcblx0fSxcclxuXHJcblx0bG9jYXRlOiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG5cclxuXHRcdG9wdGlvbnMgPSB0aGlzLl9sb2NhdGVPcHRpb25zID0gTC5leHRlbmQoe30sIHRoaXMuX2RlZmF1bHRMb2NhdGVPcHRpb25zLCBvcHRpb25zKTtcclxuXHJcblx0XHRpZiAoISgnZ2VvbG9jYXRpb24nIGluIG5hdmlnYXRvcikpIHtcclxuXHRcdFx0dGhpcy5faGFuZGxlR2VvbG9jYXRpb25FcnJvcih7XHJcblx0XHRcdFx0Y29kZTogMCxcclxuXHRcdFx0XHRtZXNzYWdlOiAnR2VvbG9jYXRpb24gbm90IHN1cHBvcnRlZC4nXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb25SZXNwb25zZSA9IEwuYmluZCh0aGlzLl9oYW5kbGVHZW9sb2NhdGlvblJlc3BvbnNlLCB0aGlzKSxcclxuXHRcdCAgICBvbkVycm9yID0gTC5iaW5kKHRoaXMuX2hhbmRsZUdlb2xvY2F0aW9uRXJyb3IsIHRoaXMpO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLndhdGNoKSB7XHJcblx0XHRcdHRoaXMuX2xvY2F0aW9uV2F0Y2hJZCA9XHJcblx0XHRcdCAgICAgICAgbmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24ob25SZXNwb25zZSwgb25FcnJvciwgb3B0aW9ucyk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKG9uUmVzcG9uc2UsIG9uRXJyb3IsIG9wdGlvbnMpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c3RvcExvY2F0ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKG5hdmlnYXRvci5nZW9sb2NhdGlvbiAmJiBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uY2xlYXJXYXRjaCkge1xyXG5cdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uY2xlYXJXYXRjaCh0aGlzLl9sb2NhdGlvbldhdGNoSWQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuX2xvY2F0ZU9wdGlvbnMpIHtcclxuXHRcdFx0dGhpcy5fbG9jYXRlT3B0aW9ucy5zZXRWaWV3ID0gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9LFxyXG5cclxuXHRfaGFuZGxlR2VvbG9jYXRpb25FcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0XHR2YXIgYyA9IGVycm9yLmNvZGUsXHJcblx0XHQgICAgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgfHxcclxuXHRcdCAgICAgICAgICAgIChjID09PSAxID8gJ3Blcm1pc3Npb24gZGVuaWVkJyA6XHJcblx0XHQgICAgICAgICAgICAoYyA9PT0gMiA/ICdwb3NpdGlvbiB1bmF2YWlsYWJsZScgOiAndGltZW91dCcpKTtcclxuXHJcblx0XHRpZiAodGhpcy5fbG9jYXRlT3B0aW9ucy5zZXRWaWV3ICYmICF0aGlzLl9sb2FkZWQpIHtcclxuXHRcdFx0dGhpcy5maXRXb3JsZCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZmlyZSgnbG9jYXRpb25lcnJvcicsIHtcclxuXHRcdFx0Y29kZTogYyxcclxuXHRcdFx0bWVzc2FnZTogJ0dlb2xvY2F0aW9uIGVycm9yOiAnICsgbWVzc2FnZSArICcuJ1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHJcblx0X2hhbmRsZUdlb2xvY2F0aW9uUmVzcG9uc2U6IGZ1bmN0aW9uIChwb3MpIHtcclxuXHRcdHZhciBsYXQgPSBwb3MuY29vcmRzLmxhdGl0dWRlLFxyXG5cdFx0ICAgIGxuZyA9IHBvcy5jb29yZHMubG9uZ2l0dWRlLFxyXG5cdFx0ICAgIGxhdGxuZyA9IG5ldyBMLkxhdExuZyhsYXQsIGxuZyksXHJcblx0XHQgICAgYm91bmRzID0gbGF0bG5nLnRvQm91bmRzKHBvcy5jb29yZHMuYWNjdXJhY3kpLFxyXG5cdFx0ICAgIG9wdGlvbnMgPSB0aGlzLl9sb2NhdGVPcHRpb25zO1xyXG5cclxuXHRcdGlmIChvcHRpb25zLnNldFZpZXcpIHtcclxuXHRcdFx0dmFyIHpvb20gPSB0aGlzLmdldEJvdW5kc1pvb20oYm91bmRzKTtcclxuXHRcdFx0dGhpcy5zZXRWaWV3KGxhdGxuZywgb3B0aW9ucy5tYXhab29tID8gTWF0aC5taW4oem9vbSwgb3B0aW9ucy5tYXhab29tKSA6IHpvb20pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBkYXRhID0ge1xyXG5cdFx0XHRsYXRsbmc6IGxhdGxuZyxcclxuXHRcdFx0Ym91bmRzOiBib3VuZHMsXHJcblx0XHRcdHRpbWVzdGFtcDogcG9zLnRpbWVzdGFtcFxyXG5cdFx0fTtcclxuXHJcblx0XHRmb3IgKHZhciBpIGluIHBvcy5jb29yZHMpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBwb3MuY29vcmRzW2ldID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHRcdGRhdGFbaV0gPSBwb3MuY29vcmRzW2ldO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5maXJlKCdsb2NhdGlvbmZvdW5kJywgZGF0YSk7XHJcblx0fVxyXG59KTtcclxuXG5cbn0od2luZG93LCBkb2N1bWVudCkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGVhZmxldC1zcmMubWFwIiwiTC5Ub29sdGlwID0gTC5MYXllci5leHRlbmQoe1xuXG4gIG9wdGlvbnM6IHtcbiAgICBwYW5lOiAncG9wdXBQYW5lJyxcbiAgICBub25CdWJibGluZ0V2ZW50czogWydtb3VzZW92ZXInLCAnbW91c2Vtb3ZlJ10sXG4gICAgcG9zaXRpb246ICdsZWZ0JyxcbiAgICBjbGFzc05hbWU6ICd0b29sdGlwJyxcbiAgICBhcnJvd0NsYXNzOiAndG9vbHRpcC1hcnJvdycsXG4gICAgY29udGVudENsYXNzOiAndG9vbHRpcC1pbm5lcicsXG4gICAgc3VidGV4dENsYXNzOiAndG9vbHRpcC1zdWJ0ZXh0JyxcbiAgICBzaG93Q2xhc3M6ICdpbicsXG4gICAgbm9XcmFwOiBmYWxzZSxcbiAgICB3cmFwU2NyZWVuOiB0cnVlLFxuICAgIG9mZnNldDogWzEwLCA1XVxuICB9LFxuXG4gIHN0YXRpY3M6IHtcblxuICAgIC8qKlxuICAgICAqIEBlbnVtIHtTdHJpbmd9XG4gICAgICovXG4gICAgUE9TSVRJT05TOiB7XG4gICAgICBUT1A6ICAgICd0b3AnLFxuICAgICAgTEVGVDogICAnbGVmdCcsXG4gICAgICBCT1RUT006ICdib3R0b20nLFxuICAgICAgUklHSFQ6ICAncmlnaHQnXG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBjbGFzcyBMLlRvb2x0aXBcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0gIHsqPX0gICAgIHNvdXJjZVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucywgc291cmNlKSB7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKi9cbiAgICB0aGlzLl9jb250YWluZXIgICA9IG51bGw7XG5cblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqL1xuICAgIHRoaXMuX2Fycm93ICAgICAgID0gbnVsbDtcblxuXG4gICAgLyoqXG4gICAgICogQHR5cGUge0VsZW1lbnR9XG4gICAgICovXG4gICAgdGhpcy5fY29udGVudE5vZGUgPSBudWxsO1xuXG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKi9cbiAgICB0aGlzLl9zdWJ0ZXh0ICAgICA9IG51bGw7XG5cblxuICAgIEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7TC5MYXllcn1cbiAgICAgKi9cbiAgICB0aGlzLl9zb3VyY2UgICAgICA9IHNvdXJjZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGVsZW1lbnRzXG4gICAqL1xuICBfaW5pdExheW91dDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgaWYgKG9wdGlvbnMubm9XcmFwKSB7XG4gICAgICBvcHRpb25zLmNsYXNzTmFtZSArPSAnIG5vd3JhcCc7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lciAgID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5jbGFzc05hbWUgKyAnICcgKyBvcHRpb25zLnBvc2l0aW9uICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJyAnICsgb3B0aW9ucy5zaG93Q2xhc3MpO1xuICAgIHRoaXMuX2Fycm93ICAgICAgID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5hcnJvd0NsYXNzLCB0aGlzLl9jb250YWluZXIpO1xuICAgIHRoaXMuX2NvbnRlbnROb2RlID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5jb250ZW50Q2xhc3MsIHRoaXMuX2NvbnRhaW5lcik7XG4gICAgdGhpcy5fc3VidGV4dCAgICAgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnN1YnRleHRDbGFzcywgdGhpcy5fY29udGFpbmVyKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLk1hcH0gbWFwXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIG9uQWRkOiBmdW5jdGlvbihtYXApIHtcbiAgICB0aGlzLl9tYXAgPSBtYXA7XG4gICAgdGhpcy5faW5pdExheW91dCgpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudCkge1xuICAgICAgdGhpcy5zZXRDb250ZW50KHRoaXMub3B0aW9ucy5jb250ZW50KTtcbiAgICB9XG4gICAgdGhpcy5nZXRQYW5lKCkuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICBMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtMLlRvb2x0aXB9XG4gICAqL1xuICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICBMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLk1hcH0gbWFwXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIG9uUmVtb3ZlOiBmdW5jdGlvbihtYXApIHtcbiAgICB0aGlzLmdldFBhbmUoKS5yZW1vdmVDaGlsZCh0aGlzLl9jb250YWluZXIpO1xuICAgIHRoaXMuX21hcCA9IG51bGw7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRcbiAgICogQHJldHVybiB7TC5MYXRMbmd9XG4gICAqL1xuICBzZXRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgdGhpcy5fY29udGVudE5vZGUuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHJldHVybiB7TC5Ub29sdGlwfVxuICAgKi9cbiAgc2V0U3VidGV4dDogZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuX3N1YnRleHQuaW5uZXJIVE1MID0gdGV4dDtcbiAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogQHBhcmFtIHtMLkxhdExuZ30gbGF0bG5nXG4gICAqIEByZXR1cm4ge0wuVG9vbHRpcH1cbiAgICovXG4gIHNldExhdExuZzogZnVuY3Rpb24obGF0bG5nKSB7XG4gICAgdGhpcy5fbGF0bG5nID0gbGF0bG5nO1xuICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLlBvaW50fSBwb2ludCBQb3NpdGlvblxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBvc2l0aW9uXG4gICAqL1xuICBfZ2V0T2Zmc2V0OiBmdW5jdGlvbihwb2ludCwgcG9zaXRpb24pIHtcbiAgICB2YXIgY29udGFpbmVyICA9IHRoaXMuX2NvbnRhaW5lcjtcbiAgICB2YXIgb3B0aW9ucyAgICA9IHRoaXMub3B0aW9ucztcbiAgICB2YXIgd2lkdGggICAgICA9IGNvbnRhaW5lci5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ICAgICA9IGNvbnRhaW5lci5vZmZzZXRIZWlnaHQ7XG4gICAgdmFyIFBPU0lUSU9OUyAgPSBMLlRvb2x0aXAuUE9TSVRJT05TO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy53cmFwU2NyZWVuKSB7XG4gICAgICB2YXIgbWFwU2l6ZSA9IHRoaXMuX21hcC5nZXRTaXplKCk7XG4gICAgICBwb2ludCA9IHRoaXMuX21hcC5sYXllclBvaW50VG9Db250YWluZXJQb2ludChwb2ludCk7XG4gICAgICBpZiAocG9pbnQueCArIHdpZHRoIC8gMiAgPiBtYXBTaXplLngpIHtcbiAgICAgICAgcG9zaXRpb24gPSBQT1NJVElPTlMuTEVGVDtcbiAgICAgIH1cbiAgICAgIGlmIChwb2ludC54IC0gd2lkdGggPCAwKSB7XG4gICAgICAgIHBvc2l0aW9uID0gUE9TSVRJT05TLlJJR0hUO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9pbnQueSAtIGhlaWdodCA8IDApIHtcbiAgICAgICAgcG9zaXRpb24gPSBQT1NJVElPTlMuQk9UVE9NO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9pbnQueSArIGhlaWdodCA+IG1hcFNpemUueSkge1xuICAgICAgICBwb3NpdGlvbiA9IFBPU0lUSU9OUy5UT1A7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fY29udGFpbmVyLmNsYXNzTmFtZSA9IChvcHRpb25zLmNsYXNzTmFtZSArICcgJyArIHBvc2l0aW9uICtcbiAgICAgICcgJyArIG9wdGlvbnMuc2hvd0NsYXNzKTtcblxuICAgIHZhciBvZmZzZXQgPSBvcHRpb25zLm9mZnNldDtcbiAgICBpZiAocG9zaXRpb24gICAgICAgID09PSBQT1NJVElPTlMuTEVGVCkge1xuICAgICAgcmV0dXJuIG5ldyBMLlBvaW50KC13aWR0aCAtIG9mZnNldFswXSwgLWhlaWdodCAvIDIpLl9mbG9vcigpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09IFBPU0lUSU9OUy5SSUdIVCkge1xuICAgICAgcmV0dXJuIG5ldyBMLlBvaW50KDAgKyBvZmZzZXRbMF0sIC1oZWlnaHQgLyAyKS5fZmxvb3IoKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBQT1NJVElPTlMuVE9QKSB7XG4gICAgICByZXR1cm4gbmV3IEwuUG9pbnQoLXdpZHRoIC8gMiwgLWhlaWdodCAtIG9mZnNldFsxXSkuX2Zsb29yKCk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gUE9TSVRJT05TLkJPVFRPTSkge1xuICAgICAgcmV0dXJuIG5ldyBMLlBvaW50KC13aWR0aCAvIDIsIDAgKyBvZmZzZXRbMV0pLl9mbG9vcigpO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gIHtMLlBvaW50PX0gcG9pbnRcbiAgICovXG4gIHVwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbihwb2ludCkge1xuICAgIEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFwb2ludCkge1xuICAgICAgICBwb2ludCA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fbGF0bG5nKTtcbiAgICAgIH1cbiAgICAgIEwuRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9jb250YWluZXIsIHBvaW50LmFkZChcbiAgICAgICAgdGhpcy5fZ2V0T2Zmc2V0KHBvaW50LCB0aGlzLm9wdGlvbnMucG9zaXRpb24pKSk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxufSk7XG5cbkwudG9vbHRpcCA9IGZ1bmN0aW9uKG9wdGlvbnMsIHNvdXJjZSkge1xuICByZXR1cm4gbmV3IEwuVG9vbHRpcChvcHRpb25zLCBzb3VyY2UpO1xufTtcbiJdfQ==
