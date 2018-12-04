$('#search').off('submit').on('submit', function () {
    var query = {
        "statements": [{
            "statement": $('#query').val(),
            "resultDataContents": ["graph"]
        }]
    };

    $.ajax({
        type: "POST",
        url: "http://localhost:11009/db/data/transaction/commit",
        accepts: {json: "application/json"},
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(query),

        success: function (data) {
            var graph = getGraph(data);
            makeGraph(graph.nodes, graph.links);
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

    node.on("mouseover", function(d) {
        node.style("fill", function (o) {
            if (d === o) return "magenta";
      });
        node.style("stroke", function (o) {
            if (d === o) return "magenta";
      });
    });

    node.on("mouseout", function(d, i) {
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

function getGraph(data) {
    var nodes = [],
        links = [];
    data.results[0].data.forEach(function (row) {
        row.graph.nodes.forEach(function (n) {
            if (idIndex(nodes, n.id) == null) {
                nodes.push({id: n.id, label: n.labels[0], title: n.properties.name});
            }
        });
        links = links.concat(row.graph.relationships.map(function (r) {
            // the neo4j documents has an error : replace start with source and end with target
            return {source: idIndex(nodes, r.startNode), target: idIndex(nodes, r.endNode), type: r.type};
        }));
    });
    return {nodes: nodes, links: links};
}

function idIndex(a, id) {
    for (var i = 0; i < a.length; i++) {
        if (a[i].id == id) return i;
    }
    return null;
}