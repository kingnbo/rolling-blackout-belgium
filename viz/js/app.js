var main = function() {
    window.selectedSection = "all";

    // Draw map
    drawMap();

    // Select section with button
    $(".select-section").click(function() {
        $(".select-section").removeClass("active")
        $(this).addClass("active");
        selectedSection = this.value;
        changeSectionOnMap();
    });
};

function drawMap() {
    window.map;
    var MAPTYPE_ID = "custom_style";
    var mapStyle = [
        { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 17 } ] },
        { "featureType": "landscape", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 20 } ] },
        { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [ { "color": "#000000" }, { "lightness": 17 } ] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [ { "color": "#000000" }, { "lightness": 29 }, { "weight": 0.2 } ] },
        { "featureType": "road.arterial", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 18 } ] },
        { "featureType": "road.local", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 16 } ] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 21 } ] },
        { "elementType": "labels.text.stroke", "stylers": [ { "visibility": "on" }, { "color": "#000000" }, { "lightness": 16 } ] },
        { "mapType": "Map", "elementType": "labels.text.fill", "stylers": [ { "saturation": 36 }, { "color": "#000000" }, { "lightness": 40 } ] },
        { "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] },
        { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#000000" }, { "lightness": 19 } ] },
        { "featureType": "administrative", "elementType": "geometry.fill", "stylers": [ { "color": "#000000" }, { "lightness": 20 } ] },
        { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [ { "color": "#000000" }, { "lightness": 17 }, { "weight": 1.2 } ] }
    ];
    var featureOpts = mapStyle;
    var mapOptions = {
        zoom: 8,
        center: new google.maps.LatLng(50.52,4.5),
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID, MAPTYPE_ID]
        },
        mapTypeId: MAPTYPE_ID
    };

    window.map = new google.maps.Map(document.getElementById("map"),  mapOptions);
    var styledMapOptions = {
        name: "Custom Style"
    };
    var customMapType = new google.maps.StyledMapType(featureOpts, styledMapOptions);
    window.map.mapTypes.set(MAPTYPE_ID, customMapType);
    showBlackoutDataOnMap(window.map);
};

// show the detailed info of a municipality in the sidebar
function showMunicipalityInfo(data) {
    var sectionField = "section_" + selectedSection + "_pct";
    var sql = "SELECT district, section_1_pct, section_2_pct, section_3_pct, section_4_pct, section_5_pct, section_6_pct, section_all_pct FROM rolling_blackout WHERE municipality_geojson='" + data.municipality + "';";
    $("#municipality-name").text(data.municipality);
    var municipalityData = data.section_all + ' of the ' + data.total + ' power distribution cabinets (' + data.section_all_pct + '%) are included in the rolling blackout plan.';
    $("#municipality-data").text(municipalityData);
    $("#district-data").show();
    $("#district-data tbody").empty();
    $.get("http://datafable.cartodb.com/api/v2/sql?q=" + sql, function(data) {
        var tablerows = "";
        _.each(data.rows, function(i) {
            var rowValues = [i.district, i.section_1_pct, i.section_2_pct, i.section_3_pct, i.section_4_pct, i.section_5_pct, i.section_6_pct, i.section_all_pct];
            var tableRow = ["<tr>"];
            _.each(rowValues, function(value, index) {
                if (index == 0) {
                    var openTag = "<td>";
                    var closeTag = "</td>";
                } else if (index == 7) {
                    if (value == "0") {
                        value = "-";
                    } else {
                        value = value + "%";
                    }
                    var openTag = "<th class=\"section-all\">";
                    var closeTag = "</th>";
                } else {
                    if (value == "0") {
                        value = "-";
                    } else {
                        value = value + "%";
                    }
                    var openTag = "<th class=\"section-all\">";
                    var openTag = "<td class=\"section-" + index + "\">";
                    var closeTag = "</td>";
                }
                tableRow.push(openTag + value + closeTag);
            });
            tableRow.push("</tr>");
            tablerows = tablerows + tableRow.join("");
        });
        $("#district-data tbody").append(tablerows);
        highlightSectionInTable();
    });
}

function showBlackoutDataOnMap(map) {
    var sql = "WITH rolling_blackout_by_municipality AS (SELECT municipality, municipality_geojson, sum(coalesce(section_all,0)) AS section_all, sum(total) AS total, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_1,0))/sum(total)*100,2) ELSE 0 END AS section_1_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_2,0))/sum(total)*100,2) ELSE 0 END AS section_2_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_3,0))/sum(total)*100,2) ELSE 0 END AS section_3_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_4,0))/sum(total)*100,2) ELSE 0 END AS section_4_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_5,0))/sum(total)*100,2) ELSE 0 END AS section_5_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_6,0))/sum(total)*100,2) ELSE 0 END AS section_6_pct, CASE WHEN sum(total) != 0 THEN round(sum(coalesce(section_all,0))/sum(total)*100,2) ELSE 0 END AS section_all_pct FROM rolling_blackout GROUP BY municipality, municipality_geojson ) SELECT m.cartodb_id, m.the_geom, m.the_geom_webmercator, m.region, b.* FROM rolling_blackout_by_municipality b LEFT JOIN municipalities_belgium m ON b.municipality_geojson = m.name ORDER BY b.municipality";
    var section = "section_all_pct"
    var cartocss = "#rolling_blackout { polygon-fill: #1a9850; polygon-opacity: 0.8; line-color: #333333; line-width: 0.5; line-opacity: 1; } #rolling_blackout[" + section + " = 100] { polygon-fill: #d73027; } #rolling_blackout[" + section + " < 100] { polygon-fill: #f79272; } #rolling_blackout[" + section + " < 80] { polygon-fill: #fed6b0; } #rolling_blackout[" + section + " < 60] { polygon-fill: #fff2cc; } #rolling_blackout[" + section + " < 40] { polygon-fill: #d2ecb4; } #rolling_blackout[" + section + " < 20] { polygon-fill: #8cce8a; } #rolling_blackout[" + section + " = 0] { polygon-fill: #1a9850; }";
    cartodb.createLayer(map, {
        user_name: "datafable",
        type: "cartodb",
        sublayers: [{
            sql: sql,
            cartocss: cartocss
        }]
    })
    .addTo(map)
    .done(function(layer) {
        window.mapLayer = layer;
        var sublayer = layer.getSubLayer(0);
        sublayer.setInteraction(true);
        var selectedFields = [
            "municipality",
            "section_all",
            "total",
            "section_all_pct"
        ];
        sublayer.set({"interactivity": selectedFields});
        sublayer.on("featureClick", function(event, latlng, pos, data, layerindex) {
            showMunicipalityInfo(data);
        });
    });
};

function changeSectionOnMap() {
    var section = "section_" + window.selectedSection + "_pct";
    var cartocss = "#rolling_blackout { polygon-fill: #1a9850; polygon-opacity: 0.8; line-color: #333333; line-width: 0.5; line-opacity: 1; } #rolling_blackout[" + section + " = 100] { polygon-fill: #d73027; } #rolling_blackout[" + section + " < 100] { polygon-fill: #f79272; } #rolling_blackout[" + section + " < 80] { polygon-fill: #fed6b0; } #rolling_blackout[" + section + " < 60] { polygon-fill: #fff2cc; } #rolling_blackout[" + section + " < 40] { polygon-fill: #d2ecb4; } #rolling_blackout[" + section + " < 20] { polygon-fill: #8cce8a; } #rolling_blackout[" + section + " = 0] { polygon-fill: #1a9850; }";
    window.mapLayer.setCartoCSS(cartocss);
    highlightSectionInTable();
}

function highlightSectionInTable() {
    var section = ".section-" + window.selectedSection;
    $("#district-data th").removeClass("info");
    $("#district-data td").removeClass("info");
    $(section).addClass("info");
}

$(document).ready(main);