'use strict';

/**
 * @summary Dynamic property getter/setters.
 * @desc ### Backing store
 * Dynamic grid properties can make use of a backing store.
 * This backing store is created in the "own" layer by {@link Hypergrid#clearState|clearState} and backs grid-only properties. We currently do not create one for derived (column and cell) properties objects.
 * The members of the backing store have the same names as the dynamic properties that utilize them.
 * They are initialized by {@link Hypergrid#clearState|clearState} to the default values from {@link module:defaults|defaults} object members (also) of the same name.
 *
 * Note that all dynamic properties must not be enumerable and configurable to protect them from being deleted when a theme is applied.
 *
 * ### Themes
 * This layer is also where themes are applied.
 *
 * Note that {@link Hypergrid#applyTheme} ensures that all thematic members are defined as enumerable and configurable so they can be deleted when a new theme is applied.
 * @name dynamicPropertyDescriptors
 * @module
 */
var dynamicPropertyDescriptors = {
    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    subgrids: {
        get: function() {
            return this.var.subgrids;
        },
        set: function(subgrids) {
            this.grid.behavior.subgrids = this.var.subgrids = subgrids;
        }
    },

    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    gridRenderer: {
        get: function() {
            return this.var.gridRenderer;
        },
        set: function(rendererName) {
            this.var.gridRenderer = rendererName;
            this.grid.renderer.setGridRenderer(rendererName);
        }
    },

    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    columnIndexes: {
        get: function() {
            return this.grid.behavior.getActiveColumns().map(function(column) {
                return column.index;
            });
        },
        set: function(columnIndexes) {
            this.grid.behavior.setColumnOrder(columnIndexes);
            this.grid.behavior.changed();
        }
    },

    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    columnNames: {
        get: function() {
            return this.grid.behavior.getActiveColumns().map(function(column) {
                return column.name;
            });
        },
        set: function(columnNames) {
            this.grid.behavior.setColumnOrderByName(columnNames);
            this.grid.behavior.changed();
        }
    },

    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    rows: {
        get: getRowPropertiesBySubgridAndRowIndex,
        set: function(rowsHash) {
            if (rowsHash) {
                setRowPropertiesBySubgridAndRowIndex.call(this, rowsHash);
                this.grid.behavior.changed();
            }
        }
    },

    /**
     * @memberOf module:dynamicPropertyDescriptors
     */
    columns: {
        get: getColumnPropertiesByColumnName,
        set: function(columnPropsHash) {
            if (columnPropsHash) {
                setColumnPropertiesByColumnName.call(this, columnPropsHash);
                this.grid.behavior.changed();
            }
        }
    }
};

function getRowPropertiesBySubgridAndRowIndex() { // to be called with grid.properties as context
    var rows = {};
    this.grid.behavior.subgrids.forEach(function(dataModel) {
        var key = dataModel.name || dataModel.type;
        for (var rowIndex = 0, rowCount = dataModel.getRowCount(); rowIndex < rowCount; ++rowIndex) {
            var height = dataModel.getRow(rowIndex).__ROW_HEIGHT;
            if (height !== undefined) {
                (rows[key] = rows[key] || {})[rowIndex] = { height: height };
            }
        }
    });
    return rows;
}

function setRowPropertiesBySubgridAndRowIndex(rowsHash) { // to be called with grid.properties as context
    var behavior = this.grid.behavior;
    for (var subgridName in rowsHash) {
        if (rowsHash.hasOwnProperty(subgridName)) {
            var subgrid = behavior.subgrids.lookup[subgridName];
            if (subgrid) {
                var subgridHash = rowsHash[subgridName];
                for (var rowIndex in subgridHash) {
                    if (subgridHash.hasOwnProperty(rowIndex)) {
                        var properties = subgridHash[rowIndex];
                        for (var propName in properties) {
                            if (properties.hasOwnProperty(propName)) {
                                var propValue = properties[propName];
                                switch (propName) {
                                    case 'height':
                                        behavior.setRowHeight(rowIndex, Number(propValue), subgrid);
                                        break;
                                    default:
                                        console.warn('Unexpected row property "' + propName + '" ignored. (The only row property currently implemented is "height").');
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function getColumnPropertiesByColumnName() { // to be called with grid.properties as context
    var columns = this.grid.behavior.getColumns(),
        headerify = this.grid.headerify;
    return columns.reduce(function(obj, column) {
        var properties = Object.keys(column.properties).reduce(function(properties, key) {
            switch (key) {
                case 'preferredWidth': // not a public property
                    break;
                case 'header':
                    if (headerify && column.properties.header === headerify(column.properties.name)) {
                        break;
                    }
                // eslint-disable-line no-fallthrough
                default:
                    var value = column.properties[key];
                    if (value !== undefined) {
                        properties[key] = value;
                    }
            }
            return properties;
        }, {});
        if (Object.keys(properties).length) {
            obj[column.name] = properties;
        }
        return obj;
    }, {});
}

function setColumnPropertiesByColumnName(columnPropsHash) { // to be called with grid.properties as context
    var columns = this.grid.behavior.getColumns();

    for (var columnName in columnPropsHash) {
        if (columnPropsHash.hasOwnProperty(columnName)) {
            var column = columns.find(nameMatches);
            if (column) {
                column.properties = columnPropsHash[columnName];
            }
        }
    }

    function nameMatches(column) {
        return column.name === columnName;
    }
}

module.exports = dynamicPropertyDescriptors;
