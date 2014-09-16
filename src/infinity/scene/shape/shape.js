(function (_) {

    /**
     * A base geometry based on vertices which is transformable and styleable
     * and may contain other elements as sub-contents
     * @class IFShape
     * @extends IFItem
     * @mixes IFNode.Container
     * @mixes IFElement.Transform
     * @mixes IFStylable
     * @mixes IFVertexSource
     * @constructor
     */
    function IFShape() {
        IFItem.call(this);
        this._setDefaultProperties(IFShape.GeometryProperties);
        this._setStyleDefaultProperties();
    }

    IFObject.inheritAndMix(IFShape, IFItem, [IFNode.Container, IFElement.Transform, IFStylable, IFVertexSource]);

    /**
     * The geometry properties of a shape with their default values
     */
    IFShape.GeometryProperties = {
        trf: null
    };

    // -----------------------------------------------------------------------------------------------------------------
    // IFShape.HitResult Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class IFShape.HitResult
     * @param {IFShape.HitResult.Type} type
     * @param {IFVertexInfo.HitResult} vertexHit
     * @constructor
     */
    IFShape.HitResult = function (type, vertexHit) {
        this.type = type;
        this.vertex = vertexHit;
    };

    /**
     * @enum
     */
    IFShape.HitResult.Type = {
        Stroke: 0,
        Fill: 1,
        Outline: 2,
        Other: 3
    };

    /**
     * @type {IFShape.HitResult.Type}
     */
    IFShape.HitResult.prototype.type = null;

    /**
     * @type {IFVertexInfo.HitResult}
     */
    IFShape.HitResult.prototype.vertexHit = null;

    // -----------------------------------------------------------------------------------------------------------------
    // IFShape Class
    // -----------------------------------------------------------------------------------------------------------------
    /** @override */
    IFShape.prototype.getStylePropertySets = function () {
        return IFStylable.prototype.getStylePropertySets.call(this)
            .concat(IFStyle.PropertySet.Fill, IFStyle.PropertySet.Stroke);
    };

    /** @override */
    IFShape.prototype.getTransform = function () {
        return this.$trf;
    };

    /** @override */
    IFShape.prototype.setTransform = function (transform) {
        this.setProperty('trf', transform);
    };

    /** @override */
    IFShape.prototype.transform = function (transform) {
        if (transform && !transform.isIdentity()) {
            this.setProperty('trf', this.$trf ? this.$trf.multiplied(transform) : transform);
        }
        IFElement.Transform.prototype._transformChildren.call(this, transform);
    };

    /** @override */
    IFShape.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof IFLayer || parent instanceof IFShapeSet || parent instanceof IFShape;
    };

    /** @override */
    IFShape.prototype._paint = function (context) {
        this._paintStyle(context, this.getPaintBBox());
    };

    /** @override */
    IFShape.prototype._paintStyleLayer = function (context, layer) {
        if (layer === IFStyle.Layer.Background) {
            if (!context.configuration.isOutline(context) && this.hasStyleFill()) {
                var canvas = context.canvas;
                var fill = this._createFillPaint(canvas, this.getGeometryBBox());
                if (fill && fill.paint) {
                    canvas.putVertices(this);

                    if (fill.transform) {
                        var oldTransform = canvas.setTransform(canvas.getTransform(true).preMultiplied(fill.transform));
                        canvas.fillVertices(fill.paint, this.$_fop);
                        canvas.setTransform(oldTransform);
                    } else {
                        canvas.fillVertices(fill.paint, this.$_fop);
                    }
                }
            }
        } else if (layer === IFStyle.Layer.Content) {
            // TODO : Check intersection of children paintbbox and if it is
            // fully contained by this shape then don't clip
            // Paint our contents if any and clip 'em to ourself
            // TODO : Use clipPath() when supporting AA in chrome instead
            // of composite painting and separate canvas!!
            var oldContentsCanvas = null;
            for (var child = this.getFirstChild(); child !== null; child = child.getNext()) {
                if (child instanceof IFElement) {
                    // Create temporary canvas if none yet
                    if (!oldContentsCanvas) {
                        oldContentsCanvas = context.canvas;
                        context.canvas = oldContentsCanvas.createCanvas(this.getGeometryBBox());
                    }

                    child.paint(context);
                }
            }

            // If we have a old contents canvas, clip our contents and swap canvas back
            if (oldContentsCanvas) {
                context.canvas.putVertices(this);
                context.canvas.fillVertices(IFColor.BLACK, 1, IFPaintCanvas.CompositeOperator.DestinationIn);
                oldContentsCanvas.drawCanvas(context.canvas);
                context.canvas.finish();
                context.canvas = oldContentsCanvas;
            }
        } else if (layer === IFStyle.Layer.Foreground) {
            var outline = context.configuration.isOutline(context);
            if (!outline && this.hasStyleStroke()) {
                var canvas = context.canvas;
                var strokeBBox = this.getGeometryBBox();
                var strokePadding = this.getStyleStrokePadding();
                if (strokePadding) {
                    strokeBBox = strokeBBox.expanded(strokePadding, strokePadding, strokePadding, strokePadding);
                }
                var stroke = this._createStrokePaint(context.canvas, strokeBBox);

                if (stroke && stroke.paint) {
                    var strokeWidth = this.$_sw;

                    // Except center alignment we need to double the stroke width
                    // as we're gonna clip half away
                    if (this.$_sa !== IFStyle.StrokeAlignment.Center) {
                        strokeWidth *= 2;
                    }

                    context.canvas.putVertices(this);

                    if (stroke.transform) {
                        // If any scale factor is != 1.0 we need to fill the whole area
                        // and clip our stroke away to ensure stroke width consistency
                        if (this.$_ssx !== 1.0 || this.$_ssy !== 1.0) {
                            // Fill everything with the stroke.paint, then clip with the stroke
                            var oldTransform = canvas.setTransform(canvas.getTransform(true).multiplied(stroke.transform));
                            var patternFillArea = stroke.transform.inverted().mapRect(strokeBBox);
                            canvas.fillRect(patternFillArea.getX(), patternFillArea.getY(), patternFillArea.getWidth(), patternFillArea.getHeight(), stroke.paint, this.$_sop);
                            canvas.setTransform(oldTransform);
                            canvas.strokeVertices(stroke.paint, strokeWidth, this.$_slc, this.$_slj, this.$_slm, 1, IFPaintCanvas.CompositeOperator.DestinationIn);
                        } else {
                            var oldTransform = canvas.setTransform(canvas.getTransform(true).multiplied(stroke.transform));
                            canvas.strokeVertices(stroke.paint, strokeWidth / stroke.transform.getScaleFactor(), this.$_slc, this.$_slj, this.$_slm, this.$_sop);
                            canvas.setTransform(oldTransform);
                        }
                    } else {
                        canvas.strokeVertices(stroke.paint, strokeWidth, this.$_slc, this.$_slj, this.$_slm, this.$_sop);
                    }

                    // TODO : Use clipPath() when supporting AA in chrome instead
                    // of composite painting and separate canvas!!
                    // Depending on the stroke alignment we might need to clip now
                    if (this.$_sa === IFStyle.StrokeAlignment.Inside) {
                        canvas.fillVertices(IFColor.BLACK, 1, IFPaintCanvas.CompositeOperator.DestinationIn);
                    } else if (this.$_sa === IFStyle.StrokeAlignment.Outside) {
                        canvas.fillVertices(IFColor.BLACK, 1, IFPaintCanvas.CompositeOperator.DestinationOut);
                    }
                }
            } else if (outline) {
                // Outline is painted with non-transformed stroke
                // so we reset transform, transform the vertices
                // ourself and then re-apply the transformation
                var transform = context.canvas.resetTransform();
                var transformedVertices = new IFVertexTransformer(this, transform);
                context.canvas.putVertices(transformedVertices);
                context.canvas.strokeVertices(context.getOutlineColor());
                context.canvas.setTransform(transform);
            }
        }
    };

    /** @override */
    IFShape.prototype._isSeparateStyleLayer = function (context, layer) {
        var result = IFStylable.prototype._isSeparateStyleLayer(context, layer);
        if (!result) {
            if (layer === IFStyle.Layer.Foreground) {
                var outline = context.configuration.isOutline(context);
                if (!outline && this.hasStyleStroke()) {
                    // If we're not having a center-aligned stroke then
                    // we need a separate canvas here
                    if (this.$_sa !== IFStyle.StrokeAlignment.Center) {
                        return true;
                    }

                    // Having a scale of !== 0 always requires a separate canvas
                    return this.$_ssx !== 1.0 || this.$_ssy !== 1.0;
                }
            }
        }
        return false;
    };

    /** @override */
    IFShape.prototype._calculateGeometryBBox = function () {
        return ifVertexInfo.calculateBounds(this, true);
    };

    /** @override */
    IFShape.prototype._calculatePaintBBox = function () {
        var source = this.getGeometryBBox();
        if (!source) {
            return null;
        }

        return this.getStyleBBox(source);
    };

    /** @override */
    IFShape.prototype._handleChange = function (change, args) {
        this._handleGeometryChangeForProperties(change, args, IFShape.GeometryProperties);

        if (change === IFNode._Change.Store) {
            this.storeProperties(args, IFShape.GeometryProperties, function (property, value) {
                if (property === 'trf' && value) {
                    return IFTransform.serialize(value);
                }
                return value;
            });
        } else if (change === IFNode._Change.Restore) {
            this.restoreProperties(args, IFShape.GeometryProperties, function (property, value) {
                if (property === 'trf' && value) {
                    return IFTransform.deserialize(value);
                }
                return value;
            });
        }

        this._handleStyleChange(change, args);

        IFItem.prototype._handleChange.call(this, change, args);
    };

    /** @override */
    IFShape.prototype._detailHitTest = function (location, transform, tolerance, force) {
        if (this.hasStyleStroke()) {
            var outlineWidth = this.$_sw * transform.getScaleFactor() + tolerance * 2;
            var vertexHit = new IFVertexInfo.HitResult();
            if (ifVertexInfo.hitTest(location.getX(), location.getY(), new IFVertexTransformer(this, transform), outlineWidth, false, vertexHit)) {
                return new IFElement.HitResultInfo(this, new IFShape.HitResult(IFShape.HitResult.Type.Stroke, vertexHit));
            }
        }

        if (this.hasStyleFill() || force) {
            var vertexHit = new IFVertexInfo.HitResult();
            if (ifVertexInfo.hitTest(location.getX(), location.getY(), new IFVertexTransformer(this, transform), tolerance, true, vertexHit)) {
                return new IFElement.HitResultInfo(this, new IFShape.HitResult(this.hasStyleFill() ? IFShape.HitResult.Type.Fill : IFShape.HitResult.Type.Other, vertexHit));
            }
        }

        if (tolerance) {
            var vertexHit = new IFVertexInfo.HitResult();
            if (ifVertexInfo.hitTest(location.getX(), location.getY(), new IFVertexTransformer(this, transform), transform.getScaleFactor() + tolerance * 2, false, vertexHit)) {
                return new IFElement.HitResultInfo(this, new IFShape.HitResult(IFShape.HitResult.Type.Outline, vertexHit));
            }
        }

        return null;
    };

    /**
     * Returns a center of the shape in world coordinates. Shape's internal transformation is applied if needed
     * @param {Boolean} includeTransform - whether to apply shape's internal transformation
     * @returns {IFPoint}
     */
    IFShape.prototype.getCenter = function (includeTransform) {
        var center = new IFPoint(0, 0);
        if (includeTransform && this.$trf) {
            center = this.$trf.mapPoint(center);
        }
        return center;
    };

    /**
     * Returns shape's internal half width before applying any transformations
     * @returns {Number}
     */
    IFShape.prototype.getOrigHalfWidth = function () {
        return 1.0;
    };

    /**
     * Returns shape's internal half width before applying any transformations
     * @returns {Number}
     */
    IFShape.prototype.getOrigHalfHeight = function () {
        return 1.0;
    };

    /** @override */
    IFShape.prototype.toString = function () {
        return "[IFShape]";
    };

    _.IFShape = IFShape;
})(this);