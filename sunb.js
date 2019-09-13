// https://observablehq.com/d/06d63187c3b448fd@367
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], function(md){return(
md`# Sunburst`
)});
  main.variable(observer("chart")).define("chart", ["data","partition","d3","width","color","brpColor","arc","format","radius"], function(data,partition,d3,width,color,brpColor,arc,format,radius)
{
    console.log('received data', data);
    const root = partition(data);
    console.log('root', root);

    root.each(d => d.current = d);

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, width])
      .style("font", "10px sans-serif");


    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${width / 2})`);

    const path = g.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", d => {
        // console.log('initial d', !!d.children, d);
        // traverse up the hierarchy to the top level parent
        var p = d;
        while (p.depth > 1) p = p.parent;
        const parentData = p.data;

        if (d.data.n)
          console.log('color data', d.data.name, d.data.n, color(d.data.name));

        if (d.data.mean) {
          // we already pre computed the mean so use that with brpColor
          return brpColor(d.data.mean);
        } else if (d.children) {
          console.log('parent color', typeof(color(parentData.name)), color(parentData.name));
          return color(parentData.name);
        } else {
          // edge leaf so compute the number from the value
          //
          const c = d3.color(brpColor(d.data.value));
          if (c) {
            return c.toString();
          }
        }
      })
    // .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.8 : 0.4) : 0)
      .attr("fill-opacity", d => arcVisible(d.current) ? 1 : 0)
      .attr("d", d => arc(d.current));

    path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

    path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join(" / ")}\n${format(d.value)}`);

    const label = g.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current))
      .text(d => d.data.name);

    const parent = g.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    const innerTitleLine1 = g.append("text")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .style("font-size", "3em")
      .attr("dy", "-0.55em")
      .attr("fill-opacity", 1)
      .text(`Org`);

    const innerTitleLine2 = g.append("text")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .style("font-size", "3em")
      .attr("dy", "0.75em")
      .attr("fill-opacity", 1)
      .text(`N = ${data.n}`);

    function clicked(p) {
      parent.datum(p.parent || root);

      innerTitleLine1.text(`${p.data.name}`);
      innerTitleLine2.text(`N = ${p.data.n}`);

      root.each(d => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      const t = g.transition().duration(900);

      // Transition the data on all arcs, even the ones that aren’t visible,
      // so that if this transition is interrupted, entering arcs will start
      // the next transition from the desired position.
      path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .filter(function(d) {
          return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
      // .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("fill-opacity", d => arcVisible(d.target) ? 1 : 0)
        .attrTween("d", d => () => arc(d.current));

      label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
    }

    function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    return svg.node();
}
);
  main.variable(observer("data")).define("data", ["d3","_"], async function(d3,_)
{
  const ungrouped = await d3.csv("https://gist.githubusercontent.com/devth/1446bd43cdb258c3bc8a4a3cf7a80a3e/raw/e45a2d8f7ee32d218ff0ed9f2faf7a0d45e5618a/data-v2.csv", d3.autoType);
//https://gist.githubusercontent.com/devth/1446bd43cdb258c3bc8a4a3cf7a80a3e/raw/e45a2d8f7ee32d218ff0ed9f2faf7a0d45e5618a/data-v2.csv
  window.ungrouped = ungrouped;


  const drivers = [
    "Abstraction",
    "BRP Index",
    "Collective Creativity",
    "Executive Function",
    "Exercise",
    "Goal Directedness",
    "Innovation Capacity",
    "Learning Capacity",
    "Learning",
    "Nutrition",
    "Quieting the Mind",
    "Resilience",
    "Self Leadership",
    "Sleep/Wake",
    "Social Safety",
  ];

  window.drivers = drivers;

  // Group by:
  // Service Area
  // Department
  // Specialty
  // Sub-Specialty
  //

  const computeInner = (name, children) => {
    // aggregate child scores and compute N
    const means = drivers.map(driver => {
      const mean = parseInt(d3.mean(children, o => o[driver]));
      return {
        name: `${driver} - ${mean}`,
        value: mean
      }
    });
    window.means = means;
    return {
      name,
      mean: d3.rollup(means, d => d3.mean(d, v => v.value)),
      n: children.length,
      children: means
    };
  };

  window.d3 = d3;

  return {
    name: "Org",
    n: ungrouped.length,
    children: Array.from(
      // At the top level we always group by Service Area
      d3.group(ungrouped, d => d["Service Area"]),
      ([name, children]) => {
        // conditionally group by department if it exists
        if (_.every(children, child => child["Department"])) {
          // Group by Department
          const aggDepartment = Array.from(
            d3.group(children, d => d["Department"]),
            ([name, children]) => {
              if (_.every(children, child => child["Specialty"])) {
                // Group by Specialty
                const aggSpecialty = Array.from(
                  d3.group(children, d => d["Specialty"]),
                  ([name, children]) => {
                    if (_.every(children, child => child["Sub-Specialty"])) {
                      // Group by sub-Specialty
                      const aggSubSpec = Array.from(
                        d3.group(children, d => d["Sub-Specialty"]),
                        ([name, children]) => {
                          return computeInner(name, children);
                        }
                      );
                      const mean = d3.mean(aggSubSpec, d => d.mean);
                      return {
                        name,
                        n: children.length,
                        mean,
                        children: aggSubSpec
                      };
                    } else {
                      return computeInner(name, children);
                    }
                  }
                );
                const mean = d3.mean(aggSpecialty, d => d.mean);
                if (!mean) {
                  console.warn('undefined mean', mean, name, aggSpecialty);
                  window.nomean = aggSpecialty;
                }
                return {
                  name,
                  n: children.length,
                  mean,
                  children: aggSpecialty
                }
              } else {
                return computeInner(name, children);
              }
            }
          );
          return {
            name,
            mean: d3.mean(aggDepartment, d => d.mean),
            n: children.length,
            children: aggDepartment
          };
        } else {
          console.warn('DOES NOT have Department', name);
          // return as is
          return computeInner(name, children);
        }
      }
    )
  };

}
);
  main.variable(observer("brpColor")).define("brpColor", ["d3","_"], function(d3,_){return(
d3.scaleThreshold()
    .domain(_.range(10, 101, 10))
    .range([
      "#F14431",
      "#F56B32",
      "#F88E35",
      "#FBA233",
      "#FEB936",
      "#FAD038",
      "#EDE13F",
      "#C9DD48",
      "#9ACD5F",
      "#64C175"
    ])
)});
  main.variable(observer("partition")).define("partition", ["d3"], function(d3){return(
data => {
  const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
  return d3.partition()
      .size([2 * Math.PI, root.height + 1])
    (root);
}
)});
  main.variable(observer("color")).define("color", ["d3","data"], function(d3,data){return(
d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1))
)});
  main.variable(observer("format")).define("format", ["d3"], function(d3){return(
d3.format(",d")
)});
  main.variable(observer("width")).define("width", function(){return(
932
)});
  main.variable(observer("radius")).define("radius", ["width"], function(width){return(
width / 6
)});
  main.variable(observer("arc")).define("arc", ["d3","radius"], function(d3,radius){return(
d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))
)});
  main.variable(observer("d3")).define("d3", ["require"], function(require){return(
require("d3@5", "d3-array@2")
)});
  main.variable(observer("_")).define("_", ["require"], function(require){return(
require("lodash")
)});
  return main;
}
