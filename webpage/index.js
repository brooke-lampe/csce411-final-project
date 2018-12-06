$(document).ready(function () {
    $('#search').off('submit').on('submit', function () {
        {
            var id = parseInt($('#query').val());
            var query = {
                "statements": [{
                    "statement": "match path = (patient:Person{id: " + id + "})-[*]->(parent:Person), path1 = (patient)-[:HAS_DISEASE]->(disease1), path2 = (parent)-[:HAS_DISEASE]->(disease) return path, path1, path2;",
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
                    if (!data || data.errors.length > 0 || data.results[0].data.length === 0) {
                        showError('This ID does not correspond to any patients. Please try agian with a different ID.')
                    } else {
                        $('g').remove();
                        $('td').remove();
                        var tree_map = getTreeMap(data);
                        var tree_root = getTreeRoot(tree_map, id);
                        var rows = getRows(tree_root, function (node) {
                            return node.children ? node.children.map(function (id) {
                                return tree_map.get(id);
                            }) : undefined;
                        });
                        drawTable(rows.reverse());

                        // Set the dimensions and margins of the diagram
                        var margin = {top: 20, right: 90, bottom: 30, left: 120},
                            width = 900 - margin.left - margin.right,
                            height = 500 - margin.top - margin.bottom;

                        // append the svg object to the body of the page
                        // appends a 'group' element to 'svg'
                        // moves the 'group' element to the top left margin
                        var svg = d3.select("svg")
                            .append("g")
                            .attr("transform", "translate("
                                + margin.left + "," + margin.top + ")");

                        var i = 0,
                            duration = 750,
                            root;

                        var treemap = d3.tree().size([height, width]);

                        // Assigns parent, children, height, depth
                        root = d3.hierarchy(tree_root, function (d) {
                            return d.children ? d.children.map(function (id) {
                                return tree_map.get(id);
                            }) : undefined;
                        });
                        root.x0 = height / 2;
                        root.y0 = 0;

                        update(root);

                        function collapse(d) {
                            if (d.children) {
                                d._children = d.children
                                d._children.forEach(collapse)
                                d.children = null
                            }
                        }

                        function update(source) {
                            var treeData = treemap(root);
                            var nodes = treeData.descendants(),
                                links = treeData.descendants().slice(1);
                            nodes.forEach(function (d) {
                                d.y = d.depth * 180
                            });
                            var node = svg.selectAll('g.node')
                                .data(nodes, function (d) {
                                    return d.id || (d.id = ++i);
                                });

                            // Enter any new modes at the parent's previous position.
                            var nodeEnter = node.enter().append('g')
                                .attr('class', 'node')
                                .attr("transform", function (d) {
                                    return "translate(" + source.y0 + "," + source.x0 + ")";
                                })
                                .on('click', click);

                            // Add Circle for the nodes
                            nodeEnter.append('circle')
                                .attr('class', 'node')
                                .attr('r', 1e-6)
                                .style("fill", function (d) {
                                    if (d.data.type === 'root') {
                                        return "red";
                                    } else if (d.data.type === 'patient') {
                                        return "black";
                                    }
                                    return "#fff";
                                });

                            // Add labels for the nodes
                            nodeEnter.append('text')
                                .attr("dy", ".35em")
                                .attr("x", function (d) {
                                    return d.children || d._children ? -13 : 13;
                                })
                                .attr("text-anchor", function (d) {
                                    return d.children || d._children ? "end" : "start";
                                })
                                .text(function (d) {
                                    return d.data.name;
                                })
                                .style('fill', function (d) {
                                    return d.data.danger ? '#c0392b' : 'black';
                                });

                            // UPDATE
                            var nodeUpdate = nodeEnter.merge(node);

                            // Transition to the proper position for the node
                            nodeUpdate.transition()
                                .duration(duration)
                                .attr("transform", function (d) {
                                    return "translate(" + d.y + "," + d.x + ")";
                                });

                            // Update the node attributes and style
                            nodeUpdate.select('circle.node')
                                .attr('r', 10)
                                .style("fill", function (d) {
                                    if (d.data.type === 'patient') {
                                        return "#2c3e50";
                                    }
                                    return "#e74c3c";
                                })
                                .attr('cursor', 'pointer');


                            // Remove any exiting nodes
                            var nodeExit = node.exit().transition()
                                .duration(duration)
                                .attr("transform", function (d) {
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
                                .data(links, function (d) {
                                    return d.id;
                                });

                            // Enter any new links at the parent's previous position.
                            var linkEnter = link.enter().insert('path', "g")
                                .attr("class", "link")
                                .attr('d', function (d) {
                                    var o = {x: source.x0, y: source.y0}
                                    return diagonal(o, o)
                                });

                            // UPDATE
                            var linkUpdate = linkEnter.merge(link);

                            // Transition back to the parent element position
                            linkUpdate.transition()
                                .duration(duration)
                                .attr('d', function (d) {
                                    return diagonal(d, d.parent)
                                });

                            // Remove any exiting links
                            var linkExit = link.exit().transition()
                                .duration(duration)
                                .attr('d', function (d) {
                                    var o = {x: source.x, y: source.y}
                                    return diagonal(o, o)
                                })
                                .remove();

                            // Store the old positions for transition.
                            nodes.forEach(function (d) {
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

                }
            });
            return false;
        }

    });
});


function getTreeMap(data) {
    var tree_map = new Map();
    var diseases = new Set();
    data.results[0].data.forEach(function (row) {
        row.graph.nodes.forEach(function (n) {
            if (!tree_map.has(n.id)) {
                var node = {};
                if (n.labels[0] === 'Person') {
                    node = {
                        id: n.properties.id,
                        name: n.properties.first_name + ' ' + n.properties.last_name,
                        type: 'patient'
                    }
                } else {
                    node = {
                        id: n.properties.id,
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
                if (!tree_map.get(r.endNode).children) {
                    if (diseases.has(r.endNode)) {
                        tree_map.get(r.endNode).danger = true;
                    } else {
                        diseases.add(r.endNode);
                    }
                }
                tree_map.get(r.startNode).children.push(r.endNode);
            }
        });
    });
    return tree_map;
}

function getTreeRoot(tree_map, id) {
    var root = null;
    tree_map.forEach(function (value) {
        if (value.children && value.id === id) {
            root = value;
            return
        }
    });
    return root;
}

function getRows(node, children) {
    var rows = [];
    if (node.children) {
        var patient_name = node.name;
        var diseases = [];
        children(node).forEach(function (child) {
            if (child.children) {
                rows = rows.concat(getRows(child, children));
            } else {
                diseases.push(child);
            }
        });
        var row = ('<tr><td rowspan="' + (diseases.length > 0 ? diseases.length : 1) + '">' + patient_name + '</td><td style="color:' + (diseases.length > 0 && diseases[0].danger ? '#c0392b' : 'black') + '">' + (diseases.length > 0 ? diseases[0].name : 'No diseases') + '</td></tr>');
        for (var i = 1; i < diseases.length; i++) {
            row += ('<tr><td style="color:' + (diseases[i].danger ? '#c0392b' : 'black') + '">' + diseases[i].name + '</td></tr>');
        }
        rows.push(row);
    }
    return rows;
}

function drawTable(rows) {
    rows.forEach(function (row) {
        $('tbody').append(row);
    });
    $('table').css('visibility', 'visible');
}
function showError(message) {
    $('table').css('visibility', 'hidden');
    $('g').remove();
    $('td').remove();
    var alert = $('<div id="alert" class="alert alert-danger .fade .in" role="alert" style="z-index: 1001;">\n' +
        '<strong>' + message + '</strong>' +
        '</div>');
    $("#alert").hide();
    $('#alert-div').prepend(alert);

    $("#alert").fadeTo(4000, 500).slideUp(500);
}
