$('#search').off('submit').on('submit', function () {
    var query = {
        "statements": [{
            "statement": $('#query').val(),
            "resultDataContents": ["graph"]
        }]
    };

    $.ajax({
        type: "POST",
        url: "http://localhost:11002/db/data/transaction/commit",
        accepts: {json: "application/json"},
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(query),

        success: function (data) {
            var tree_map = getTreeMap(data);

            // Set the dimensions and margins of the diagram
            var margin = {top: 20, right: 90, bottom: 30, left: 90},
                width = 960 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom;

            // append the svg object to the body of the page
            // appends a 'group' element to 'svg'
            // moves the 'group' element to the top left margin
            var svg = d3.select("body").append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate("
                    + margin.left + "," + margin.top + ")");

            var i = 0,
                duration = 750,
                root;

            var treemap = d3.tree().size([height, width]);

            // Assigns parent, children, height, depth
            root = d3.hierarchy(tree_map.get("0"), function(d) {
                return d.children ? d.children.map(function (id) {
                    return tree_map.get(id);
                }) : undefined;
            });
            root.x0 = height / 2;
            root.y0 = 0;

            update(root);

            function collapse(d) {
                if(d.children) {
                    d._children = d.children
                    d._children.forEach(collapse)
                    d.children = null
                }
            }

            function update(source) {
                var treeData = treemap(root);
                var nodes = treeData.descendants(),
                links = treeData.descendants().slice(1);
                nodes.forEach(function(d){ d.y = d.depth * 180});
                var node = svg.selectAll('g.node')
                    .data(nodes, function(d) {return d.id || (d.id = ++i); });

                // Enter any new modes at the parent's previous position.
                var nodeEnter = node.enter().append('g')
                    .attr('class', 'node')
                    .attr("transform", function(d) {
                        return "translate(" + source.y0 + "," + source.x0 + ")";
                    })
                    .on('click', click);

                // Add Circle for the nodes
                nodeEnter.append('circle')
                    .attr('class', 'node')
                    .attr('r', 1e-6)
                    .style("fill", function(d) {
                        if (d.data.type === 'root'){
                            return "red";
                        } else if (d.data.type === 'patient'){
                            return "black";
                        }
                        return "#fff";
                    });

                // Add labels for the nodes
                nodeEnter.append('text')
                    .attr("dy", ".35em")
                    .attr("x", function(d) {
                        return d.children || d._children ? -13 : 13;
                    })
                    .attr("text-anchor", function(d) {
                        return d.children || d._children ? "end" : "start";
                    })
                    .text(function(d) { return d.data.name; });

                // UPDATE
                var nodeUpdate = nodeEnter.merge(node);

                // Transition to the proper position for the node
                nodeUpdate.transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return "translate(" + d.y + "," + d.x + ")";
                    });

                // Update the node attributes and style
                nodeUpdate.select('circle.node')
                    .attr('r', 10)
                    .style("fill", function(d) {
                        if (d.data.type === 'root'){
                            return "red";
                        } else if (d.data.type === 'patient'){
                            return "black";
                        }
                        return "#fff";
                    })
                    .attr('cursor', 'pointer');


                // Remove any exiting nodes
                var nodeExit = node.exit().transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return "translate(" + source.y + "," + source.x + ")";
                    })
                    .remove();

                // On exit reduce the node circles size to 0
                nodeExit.select('circle')
                    .attr('r', 1e-6);

                // On exit reduce the opacity of text labels
                nodeExit.select('text')
                    .style('fill-opacity', 1e-6);

                // ****************** links section ***************************

                // Update the links...
                var link = svg.selectAll('path.link')
                    .data(links, function(d) { return d.id; });

                // Enter any new links at the parent's previous position.
                var linkEnter = link.enter().insert('path', "g")
                    .attr("class", "link")
                    .attr('d', function(d){
                        var o = {x: source.x0, y: source.y0}
                        return diagonal(o, o)
                    });

                // UPDATE
                var linkUpdate = linkEnter.merge(link);

                // Transition back to the parent element position
                linkUpdate.transition()
                    .duration(duration)
                    .attr('d', function(d){ return diagonal(d, d.parent) });

                // Remove any exiting links
                var linkExit = link.exit().transition()
                    .duration(duration)
                    .attr('d', function(d) {
                        var o = {x: source.x, y: source.y}
                        return diagonal(o, o)
                    })
                    .remove();

                // Store the old positions for transition.
                nodes.forEach(function(d){
                    d.x0 = d.x;
                    d.y0 = d.y;
                });

                // Creates a curved (diagonal) path from parent to the child nodes
                function diagonal(s, d) {

                    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

                    return path
                }

                // Toggle children on click.
                function click(d) {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    update(d);
                }
            }
        }
    });
    return false;
});

function makeGraph(nodes, links) {
    $('#graph > svg').remove();
    var width = 800, height = 700;
    var force = d3.layout.force()
        .charge(-100)
        .linkDistance(30)
        .size([width, height]);

    var svg = d3.select("#graph").append("svg")
        .attr("viewBox", [0, -0, width, height])
        .attr("pointer-events", "all");

    force.nodes(nodes).links(links).start();

    var link = svg.selectAll(".link")
        .data(links).enter()
        .append("line").attr("class", "link");

    var node = svg.selectAll(".node")
        .data(nodes).enter()
        .append("circle")
        .attr("class", function (d) {
            return "node " + d.label
        })
        .attr("r", 5)
        .call(force.drag);

    node.append("title").text(function (d) {
        return d.title;
    });

    node.on("mouseover", function (d) {
        node.style("fill", function (o) {
            if (d === o) return "magenta";
        });
        node.style("stroke", function (o) {
            if (d === o) return "magenta";
        });
    });

    node.on("mouseout", function (d, i) {
        node.style("stroke", "#222");
        node.style("fill", "#222");
    });

    force.on("tick", function () {
        link.attr("x1", function (d) {
            return d.source.x;
        })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        node.attr("cx", function (d) {
            return d.x
        })
            .attr("cy", function (d) {
                return d.y;
            });
    });

}

function getTreeMap(data) {
    var tree_map = new Map();
    data.results[0].data.forEach(function (row) {
        row.graph.nodes.forEach(function (n) {
            if (!tree_map.has(n.id)) {
                var node = {};
                if (n.labels[0] === 'Person') {
                    node = {
                        name: n.properties.first_name + ' ' + n.properties.last_name,
                        type: n.id === '0' ? 'root' : 'patient'
                    }
                } else {
                    node = {
                        name: n.properties.name,
                        type: 'disease'
                    }
                }
                tree_map.set(n.id, node);
            }
        });
        row.graph.relationships.forEach(function (r) {
            if (!tree_map.get(r.startNode).children) {
                tree_map.get(r.startNode).children = [];
            }
            if (tree_map.get(r.startNode).children.indexOf(r.endNode) === -1) {
                tree_map.get(r.startNode).children.push(r.endNode);
            }
        });
    });
    return tree_map;
}
