define([
    'src/Coord',
    'src/CountModel'
],
function (Coord, CountModel) {

    var Lattice = function (args) {
        args = $.extend({
            width: null,
            height: null,
            block_width: null,
            block_height: null,
            scale: null
        }, args);
        this.grid = [];
        this.width = args.width;
        this.height = args.height;

        this.scale = args.scale;

        this.model = new CountModel();

        this.block_width = !args.block_width ? args.default_block_size : args.block_width;
        this.block_height = !args.block_height ? args.default_block_size : args.block_height;

        for (var i = 0; i < args.width; i++) {
            this.grid[i] = [];
            for (var j = 0; j < args.height; j++) {
                this.grid[i][j] = null;
            }
        }
    };

    Lattice.prototype = {

        //default_block_size: 32, // TODO coupled to the view

        get: function (coord) {
            if (coord.i >= this.width || coord.j >= this.height) {
                throw Error('Out of bounds access');
            } else {
                return this.grid[coord.i][coord.j]
            }
        },

        set: function (coord, new_cell) {
            this.remove(coord);
            this.grid[coord.i][coord.j] = new_cell;
            if (new_cell) {
                this.model.add(new_cell.type);
            }
        },
        
        remove: function (coord) {
            var cell = this.get(coord);
            if (cell) {
                cell.destroy();
                this.grid[coord.i][coord.j] = null;
                this.model.remove(cell.type);
            }
        },

        is_empty: function (coord) {
            return this.get(coord) == null;
        },

        //return the type of cell at i, j (returns null if empty)
        get_type: function (coord) {
            var cell = this.get(coord);
            if (cell) {
                return cell.getType();
            }
            return null;
        },

        //returns the von Neumann adjacent cells to i, j
        //returns a list of {x,y} objects
        neumann_cells: function (coord) {
            //TODO add proper bounds check
            var adjacent_cells = [];
            
            var i = coord.i;
            var j = coord.j;

            //check left
            if (i - 1 >= 0) {
                adjacent_cells.push(new Coord(i - 1, j));
            }
            //check right
            if (i + 1 < this.width) {
                adjacent_cells.push(new Coord(i + 1, j));
            }
            //check bottom
            if (j + 1 < this.height) {
                adjacent_cells.push(new Coord(i, j + 1));
            }
            //check top
            if (j - 1 >= 0) {
                adjacent_cells.push(new Coord(i, j - 1));
            }
            return adjacent_cells;
        },

        //returns the adjacent cells according to Moore's algorithm
        //basically the same as von Neumann but also the 4 include diagonal cell
        moore_cells: function(coord) {
            var i = coord.i;
            var j = coord.j;

            //get all of the cells on the sides
            var adjacent_cells = this.neumann_cells(coord);

            //now get all of the diagonal cells
            //get top left
            if( i - 1 >= 0 && j - 1 >= 0)
            {
                adjacent_cells.push(new Coord(i - 1, j - 1));
            }
            //get top right
            if( i + 1 < this.width && j - 1 >= 0)
            {
                adjacent_cells.push(new Coord(i + 1, j - 1));
            }
            //get bottom right
            if( i + 1 < this.width && j + 1 < this.height)
            {
                adjacent_cells.push(new Coord(i + 1, j + 1));
            }
            //get bottom left
            if(i - 1 >= 0 && j + 1 < this.height)
            {
                adjacent_cells.push(new Coord(i - 1, j + 1));
            }

            return adjacent_cells;
        },

        //returns the number of trees currently in the grid
        type_count: function(type) {
            // FIXME inefficient
            var count = 0;
            for (var i = 0; i < this.width; i++) {
                for (var j = 0; j < this.height; j++) {
                    if(this.grid[i][j] != null && this.grid[i][j].getType() == type) {
                        count++;
                    }
                }
            }
            return count;
        },

        get_model_counts: function () {
            return this.counts;
        },

        cell_count: function() {
            return this.width * this.height;
        },

        rand_pos: function () {
            var rand_x = Math.random();
            var rand_y = Math.random();
            var i = Math.ceil(rand_x * this.width - 1);
            var j = Math.ceil(rand_y * this.height - 1);
            return new Coord(i, j);
        },

        rand_free_pos: function () {
            // FIXME infinite loop if none empty
            var pos = this.rand_pos();
            while (!this.is_empty(pos)) {
                pos = this.rand_pos();
            }
            return pos;
        },

        visit: function (callback) {
            for (var i = 0; i < this.width; i++) {
                for (var j = 0; j < this.height; j++) {
                    callback(i, j, this.grid[i][j]);
                }
            }
        },

        render: function () {
            var me = this;
            this.visit(function (i, j, cell) {
                if (cell) {
                    var entity = cell.getView();
                    if (entity) {
                        // TODO re-enable this
                        var x = i * me.block_width;// / me.scale;
                        var y = j * me.block_height;// / me.scale;
                        entity.attr({x: x, y: y});

//                        console.log(x,y);

//                        entity.attr({x: 0, y: 1200});
                    }
                }
            });
        },

        destroy: function () {
            this.visit(function (i, j, cell) {
                if (cell) {
                    cell.destroy();
                }
            });
        }

    };

    return Lattice;

});
