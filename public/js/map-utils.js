function fixFormSubmit() {
  $("form").submit(function(e) {
    e.preventDefault(); // Prevents the page from refreshing
    
    var $this = $(this);

    var fieldNames = [];

    var formData = {};

    let sendOnsIvnDetails = true;

    function getObjFromData(data, id) {

      var obj = data;

      var fields = id.split('.');

      fields.pop()
      
      fields.forEach(function (field, i) {
        var variable = field;

        let index = -1;
        if (new RegExp("\[[0-9]+\]$").test(field)) {
          index = parseInt(field.split('[')[1].replace(']', ''));

          variable = field.split('[')[0];
        }
        
        if (!obj[variable])
          obj[variable] = (index > -1 ? [] : {});

        if (index > -1 && !obj[variable][index])
          obj[variable][index] = {};

        obj = (index > -1 ? obj[variable][index] : obj[variable]);

        fieldNames.push(variable);

        if (index > -1) fieldNames.push(index);
      });

      return obj;
    };

    $.each($this[0], function (i, element) {
      if (!(!sendOnsIvnDetails && element.name?.indexOf('OnsIvn') > -1) &&
          (element.name !== undefined && element.name.length > 0))
      {
        var obj = getObjFromData(formData, $(element).attr('name') ?? $(element).attr('id'));

        if (!obj) return;

        var instances =  ($(element).attr('name') ?? $(element).attr('id'))?.split('.');
        var instance = instances[instances.length - 1];
        var index = -1;

        if (!instance) return;

        if (new RegExp("\[[0-9]+\]$").test(instance)) {
          index = parseInt(instance.split('[')[1].replace(']', ''));

          instance = instance.split('[')[0];
        }

        if (index > -1) {
          if (!obj[instance]) {
            obj[instance] = [];
          }

          obj = obj[instance];
          instance = index;
        }

        if (element instanceof HTMLInputElement) {
          if (element.type === 'text') {
            obj[instance] = $(element).val().trim();
          } else if (element.type === 'number') {
            obj[instance] = parseFloat($(element).val());
          } else if (element.type === 'checkbox') {
            obj[instance] = $(element).is(":checked");

            if (element.name === 'hasOnsIvnAccount') {
              sendOnsIvnDetails = $(element).is(":checked");
            }
          }
        } else if (element instanceof HTMLSelectElement) {
          obj[instance] = $(element).val();

        } else if (element instanceof HTMLTextAreaElement) {
          obj[instance] = $(element).val().trim();

        }
      }
    });

    if (e.target.id === "manage-data-form") {
      formData.regions.forEach(function (region, index) {
        region.Activities = region.Activities.filter((activity) => {
          return !(activity.Remove === 'true');
        });

        region.Activities.forEach(function (activity, i) {
          if (!activity.HasOnsIvnAccount) activity.HasOnsIvnAccount = false;
          if (!activity.OnsIvnAccount) activity.OnsIvnAccount = "";
          if (!activity.Show) activity.Show = false;
        });
      });

      formData.regions = formData.regions.filter((region) => {
        return VerifyRegion(region);
      });
    }

    $.post(
      $this.attr("action"),
      formData,
      function(res) {
        if (res.startsWith('{')) res = JSON.parse(res);

        console.log("submitted; response:", res.body);
        ShowToast({
          body: res.body,
          Type: res.Type,
          duration: res.duration
        });
      }
    );

    window.manageDataSubmitted = true;
  });
};

function showDetails(uniqueId, isTrue) {

    var detailsSpan = 'detailsSpan_' + uniqueId;
    var showDetailsSpan = 'showDetailsSpan_' + uniqueId;

    if (isTrue) {
      $('#' + detailsSpan).show();
      $('#' + showDetailsSpan).hide();
    } else {
      $('#' + detailsSpan).hide();
      $('#' + showDetailsSpan).show();
    }
};

function CountModes() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/js/modes/",
            success: function(data){
                let modes = 0;

                $(data).find("a:contains(.js)").each(function(){
                    modes++;
                });

                resolve(modes);
            },
            error: function (err){
                console.log(err);
            }
        });
    });
};

const sw = new mapboxgl.LngLat(2.9911, 50.54),
    ne = new mapboxgl.LngLat(7.36, 53.7),
    nlBoundaries = new mapboxgl.LngLatBounds(sw, ne),
    centerNL = [5.2793703, 52.2129919];

var data = {
    regions: [
    {
        Name: "",
        Coordinates: [0, 0],
        Activities: [
        {
            Name: "",
            Activity: "",
            Description: "",
            HasOnsIvnAccount: false,
            OnsIvnAccount: "",
            show: false
        },
        ],
    },
    ],
};
data.regions = [];
    
var coords = [],
    corrected_coords = [],
    coords_3D = [];

var map = {};

function LoadMap(settings = {}) {
    mapboxgl.accessToken =
        "pk.eyJ1Ijoicm9iYmV2IiwiYSI6ImNraTBmMWIwYTI3aWoyc3A1ZWthNDRxaW8ifQ.0UpEACtyPkQzp8Aw1oaAUQ";

    settings.container = "map";
    if (!settings.style) settings.style = "mapbox://styles/robbev/ckj2yczyh3hb019mqrl3i3nhe"; // stylesheet location
    if (!settings.center) settings.center = centerNL; // starting position [lng, lat]
    if (!settings.zoom) settings.zoom = 6.5; // starting zoom
    if (!settings.maxZoom) settings.maxZoom = 12;
    //if (!settings.maxBounds) settings.maxBounds = nlBoundaries; // boundaries for The Netherlands
    if (!settings.pitch) settings.pitch = 0;
    
    map = (window.map = new mapboxgl.Map(settings));

    AddManageButton(map);

    AddModeSwitchButton(map);

    AddInfoButton(map);

    map.addControl(new mapboxgl.NavigationControl());

    AddCloseButtonsToMenus();

    return map;
};

function ShowToast(toastMessage = { body: '', Type: '', duration: 3000 }) {
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: toastMessage.duration,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    },
  }).fire({
    icon: toastMessage.Type,
    title: toastMessage.body,
  });
};

function AddCloseButtonsToMenus() {
    $(".menu").append(
      "<button class=\"close-menu-button\">" +
        "X" +
      "</button>"
    );

    $(".close-menu-button").click(function (e) {
      CloseMenus();
    });
};

function MenuChanged(menuName) {
  var panels = document.getElementsByClassName(
    menuName
  );

  CloseMenus();

  if (panels.length > 0) {
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].style.display == 'none' || panels[i].style.display == '') {
        OpenMenu(panels[i].parentElement);
      } else CloseMenu(panels[i].parentElement);
    }
  }
};

function CloseMenus() {
  var menus = document.getElementsByClassName(
    "menu"
  );

  for (let i = 0; i < menus.length; i++) {
    menus[i].style.display = 'none';
  }
};

function CloseMenu(menu) {
  $(menu).fadeOut(150);
};

function OpenMenu(menu) {
  $(menu).fadeIn(150);

  $(menu).focus();

  $(window.map.getCanvas()).on("click", function (e) {
    if (e.target.id != "map") {
      CloseMenu(menu);
    }
  });
};

function DisposeMap() {
    map = window.map = undefined;

    data.regions = [];

    coords = [];
    corrected_coords = [];
    coords_3D = [];
};

function Init(mode =  window.defaultMode) {
    if (map || window.map) DisposeMap();

    switch (parseInt(mode)) {
      case 1:
        initMapSimple();
        break;
      
      case 2:
        initMapAdvanced();
        break;

      case 3:
        initMapHeatMap();
        break;

      default:
        initMapSimple();
    };
};

function SwitchMode(newMode = 1) {
    window.location.href = "/?mode=" + parseInt(newMode).toString();
    console.log("Switched map to mode: " + newMode);
};

function retrieveMapDataFromSource() {
    return new Promise((resolve, reject) => {
      let method = "GET",
        url = "/data";

      $.ajax({
        url: url,
        type: method,
        contentType: "application/json; charset=utf-8",
        dataFilter: function (jsonData) {
          return jsonData;
        },
        success: function (jsonData) {
          if (typeof jsonData === "string") {
            jsonData = JSON.parse(jsonData);
          }

          if (jsonData.regions) {
            resolve(jsonData.regions);
          }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
          //alert(textStatus);
          console.warn(textStatus);
          reject(textStatus);
        },
      });
    });
};

function createRegionPopupContent(value) {
    let description = "<h3>" + value.Name + "</h3>";
    value.Activities.filter((activity) => activity.Show).forEach((activity, index) => {
        description += 
        (index > 0 ? "<br />" : "") +
        createActivityPopupContent(activity);
    });

    return description;
};

function createActivityPopupContent(activity, location = undefined) {
  return "<table class=\"table table-bordered ivn-font\">" +
          "<thead>" +
            "<tr>" +
              "<th style=\"word-break: keep-all;\">" +
              activity.Activity +
              "</th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" +
            "<tr>" +
              "<td style=\"word-break: keep-all;\">" +
                "Door " + activity.Name +
              "</td>" +
            "</tr>" +
            (
              location ? 
              "<tr>" +
                "<td style=\"word-break: keep-all;\">" +
                  location +
                "</td>" +
              "</tr>"
              : ""
            ) +
            "<tr>" +
              "<td style=\"word-break: keep-all;\">" +
                "<span id=\"detailsSpan_" + activity.Name.replace(/ /g, "_") + "_" + activity.Activity.replace(/ /g, "_") + "\" style=\"display:none\">" +
                  "<text style=\"word-break: keep-all;\"><i>\"" + activity.Description + "\"</i></text><br />" +
                  "<a class=\"btn\" onclick=\"showDetails('" + activity.Name.replace(/ /g, "_") + "_" + activity.Activity.replace(/ /g, "_") + "', false)\"><i class=\"fas fa-times\"></i> click to close...</a>" +
                "</span>" +
                "<span id=\"showDetailsSpan_" + activity.Name.replace(/ /g, "_") + "_" + activity.Activity.replace(/ /g, "_") + "\">" +
                  "<a class=\"btn\" onclick=\"showDetails('" + activity.Name.replace(/ /g, "_") + "_" + activity.Activity.replace(/ /g, "_") + "', true)\"><i class=\"fas fa-plus\"></i> click to read more...</a>" +
                "</span>" +
              "</td>" +
            "</tr>" +
            (
              activity.HasOnsIvnAccount ?
                  "<tr>" +
                    "<td>" +
                      "Te vinden op <a class=\"text-decoration-none\" target=\"_blank\" href=\"https://ons.ivn.nl/\">ons.ivn</a> als:<br />" +
                      "<a class=\"text-decoration-none\" target=\"_blank\" href=\"https://ons.ivn.nl/zoeken?facets=%7B%22typeName%22%3A%5B%22iris_iris_IntranetUserProfile%22%5D%7D&q=" + activity.OnsIvnAccount.replace(/ /g, "%20") + "&cm_lg=nl" + "\">" + activity.OnsIvnAccount + "</a>" +
                    "</td>" +
                  "</tr>"
                  : ""
            ) +
          "</tbody>" +
        "</table>";
};

function AddInfoButton(map) {
  class SwitchModeButton {
    onAdd(map) {
      let ctrl = this;
      ctrl.map = map;
      ctrl.container = document.createElement("button");
      ctrl.container.className = "mapboxgl-ctrl btn info-button ivn-font";
      ctrl.container.innerHTML = "<i class=\"fas fa-info-circle\"></i>";
      $(ctrl.container).attr('title', 'info');
      return ctrl.container;
    };
    onRemove() {
      let ctrl = this;
      ctrl._container.parentNode.removeChild(ctrl._container);
      ctrl._map = undefined;
    };
  };

  map.addControl(new SwitchModeButton(), "top-left");

  var infoButtons = document.getElementsByClassName(
    "info-button"
  );

  for (let i = 0; i < infoButtons.length; i++) {
    infoButtons[i].addEventListener("click", (e) => {
        MenuChanged("info-panel");
    });
  };
};

function AddModeSwitchButton(map) {
    class SwitchModeButton {
        onAdd(map) {
          let ctrl = this;
          ctrl.map = map;
          ctrl.container = document.createElement("button");
          ctrl.container.className = "mapboxgl-ctrl btn mode-switch-button ivn-font";
          ctrl.container.innerHTML = "<i class=\"fas fa-sync\"></i> Verander kaarttype";
          $(ctrl.container).attr('title', 'actief: kaarttype ' + window.mode + ' / ' + window.modeMax);
          return ctrl.container;
        };
        onRemove() {
          let ctrl = this;
          ctrl._container.parentNode.removeChild(ctrl._container);
          ctrl._map = undefined;
        };
    };
  
    map.addControl(new SwitchModeButton(), "top-left");

    var switchModebuttons = document.getElementsByClassName(
        "mode-switch-button"
    );
  
    for (let i = 0; i < switchModebuttons.length; i++) {
        switchModebuttons[i].addEventListener("click", (e) => {
            let newMode = mode + 1;
            if (newMode > modeMax) newMode = 1;

            SwitchMode(newMode);
        });
    };
};

function AddManageButton(map) {
  class ManageButton {
      onAdd(map) {
        let ctrl = this;
        ctrl.map = map;
        ctrl.container = document.createElement("button");
        ctrl.container.className = "mapboxgl-ctrl btn manage-button";
        ctrl.container.innerHTML = "<i class=\"fas fa-cogs\"></i>";
        $(ctrl.container).attr('title', 'Admins only!');
        return ctrl.container;
      };
      onRemove() {
        let ctrl = this;
        ctrl._container.parentNode.removeChild(ctrl._container);
        ctrl._map = undefined;
      };
  };

  map.addControl(new ManageButton(), "bottom-left");

  var manageButtons = document.getElementsByClassName(
      "manage-button"
  );

  for (let i = 0; i < manageButtons.length; i++) {
      manageButtons[i].addEventListener("click", (e) => {
          MenuChanged("manage-menu");
      });
  };

  var authButtons = document.getElementsByClassName(
    "manage-auth-button"
  );

  for (let i = 0; i < authButtons.length; i++) {
    authButtons[i].addEventListener("click", async (e) => {
        await TryAuthorizing();
    });
  };
};

function AddActivityForm(map) {

    var addActivityButtons = document.getElementsByClassName(
        "add-activity-button"
    );
  
    for (let i = 0; i < addActivityButtons.length; i++) {
        addActivityButtons[i].addEventListener("click", function (e) {
          MenuChanged("add-activity-form-container");
        });
    };

    var locationSearchBoxes = document.getElementsByClassName(
        "activity-regions-search"
    );
      
    for (let i = 0; i < locationSearchBoxes.length; i++) {
        locationSearchBoxes[i].addEventListener("input", async (e) => {
          let text = e.target.value;

          if (text && text.length > 1) {
            try {
              var regions = await getRegions(text);
  
              appendRegions(regions);
            } catch (e) {
              console.warn(e);
            }
          } else {
            appendRegions([]);
          }
        });
    }

    function getRegions(lookupString = "") {
      return new Promise((resolve, reject) => {
          try {
              let method = "GET",
                  url =  new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + lookupString + ".json?country=" + $(".region-search-country-select").val() + "&limit=8&types=place");
          
              url.searchParams.append('access_token', mapboxgl.accessToken);
          
              $.ajax({
                  url: url,
                  type: method,
                  contentType: "application/json; charset=utf-8",
                  dataFilter: function (jsonData) {
                    return jsonData;
                  },
                  success: function (jsonData) {
                    if (typeof jsonData === "string") {
                      jsonData = JSON.parse(jsonData);
                    }
          
                    if (jsonData.features) {
                      var regions = $.map(jsonData.features, function (value, index) {
                        return {
                          region: value.place_name,
                          name: value.text,
                          type: value.place_type[0],
                          coords: value.geometry.coordinates
                        }
                      });
          
                      resolve(regions);
                    }
                  },
                  error: function (XMLHttpRequest, textStatus, errorThrown) {
                    reject(textStatus);
                  },
              });
          } catch (e) {
              reject(e);
          }
      });
    };

    function appendRegions(regions = []) {
        var regionSelects = document.getElementsByClassName(
          "activity-select"
        );
  
        if (regionSelects.length > 0)
        {
          for (let i = 0 ; i < regionSelects.length; i++) {
            $.each(regionSelects[i].children, function (index, element) {
              regionSelects[i].removeChild(element);
            });

            if (regionSelects[i].children.length < 1) {
              var options = [];

              options = regions;

              for (let x = 0; x < options.length; x++) {
                var option = '<option value="' + options[x].region + '">' + options[x].region + '</option>';

                $(regionSelects[i]).append(option);
              }
            }
          }
        }
    };

    var OnsIvnAccountCheckboxes = document.getElementsByClassName(
        "onsivnaccount-checkbox"
    );

    for (let i = 0; i < OnsIvnAccountCheckboxes.length; i++) {
        OnsIvnAccountCheckboxes[i].addEventListener("click", async (e) => {
          let checked = e.target.checked;

          if (checked) {
            document.getElementById("OnsIvnAccount").style.display = '';
          } else {
            document.getElementById("OnsIvnAccount").style.display = 'none';
          }
        });
    };
};

function ShowPopup(coordinates, body, map) {
    return new mapboxgl.Popup({
        offset: 15,
        className: "region-popup ivn-font",
    }).setLngLat(coordinates)
      .setHTML(body)
      .addTo(map);
};

function VerifyRegion(region) {
  if (!region.Name || region.Coordinates.length != 2 ||
      region.Activities.length < 1) {
      return false;
  }

  if (!VerifyActivitiesInRegion(region)) {
    return false;
  }

  return true;
};

function VerifyActivitiesInRegion(region) {
  let validActivities = true;
  let anyToShow = false;

  region.Activities.forEach(function (activity, index) {
    if (!activity.Activity || !activity.Name || !activity.Description || activity.Show === undefined) {
      validActivities = false;
    }

    if (activity.Show) {
      anyToShow = true;
    }
  });

  return (validActivities && anyToShow);
};

function AddMarkers(map, showPopup = false) {
    data.regions.filter((region => VerifyRegion(region))).forEach(function (value, index) {
        
        var options = {
          element: document.createElement('div'),
          anchor: 'bottom',
        };

        options.element.className = 'simple-map-marker';
        options.element.innerHTML =
        '<div class=\"simple-map-marker-pin\"></div>';

        var marker = {};

        if (showPopup) {
            marker = new mapboxgl.Marker(options)
            .setLngLat(value.Coordinates)
            .setPopup(ShowPopup(value.Coordinates, createRegionPopupContent(value), map))
            .addTo(map);
        } else {
            marker = new mapboxgl.Marker(options)
            .setLngLat(value.Coordinates)
            .addTo(map);
        }
    });
};

function AddHeatmap(map, showPopup = false) {
    
    var heatmapSource = {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          crs: {
            type: "name",
            properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
          },
          features: [],
        },
    };
  
    data.regions.forEach(function (region, index) {
        region.Activities.filter((activity) => activity.Show).forEach(function (value, i) {

          var coordinates = coords[region.Name];

          if (i > 0) {
            coordinates[0] += (Math.random() * 2 - 1) * ((Math.random() * 0.015) + 0.0015);
            coordinates[1] += (Math.random() * 2 - 1) * ((Math.random() * 0.015) + 0.0015);
          }
    
          var feature = {
            type: "Feature",
            properties: {
              id: "tree_" + value.Name + "_" + value.Activity,
              mag: 3,
              felt: null,
              tree: 0,
              description: "",
            },
            geometry: {
              type: "Point",
              coordinates: [ coordinates[0], coordinates[1], 0.0 ],
            },
          };
    
          let description = createActivityPopupContent(value, region.Name);
    
          feature.properties.description = description;
    
          heatmapSource.data.features.push(feature);
        });
    });
  
    let layerIndex = 1;
    
        map.addSource("activities", heatmapSource);

        map.addLayer(
        {
          id: "activities-heat",
          type: "heatmap",
          source: "activities",
          paint: {
            // increase weight as diameter breast height increases
            "heatmap-weight": {
              "type": "identity", 
              "property": "point_count"
          },
            // increase intensity as zoom level increases
            'heatmap-intensity': {
              stops: [
                [11, 1],
                [15, 3]
              ]
            },
            // assign color values be applied to points depending on their density
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(124,155,57,0)',
              0.2, 'rgb(168,209,156)',
              0.4, 'rgb(164,175,87)',
              0.6, 'rgb(164,205,57)',
              0.8, 'rgb(94,225,22)',
              1.0, 'rgb(82, 210, 16)'
            ],
            // increase radius as zoom increases
            'heatmap-radius': {
              stops: [
                [11, 7],
                [15, 12]
              ]
            },
            // decrease opacity to transition into the circle layer
            'heatmap-opacity': {
              default: 1,
              stops: [
                [14, 1],
                [15, 0]
              ]
            },
          },
        },
        "admin-1-boundary-bg"
        );

        map.addLayer(
        {
          id: "activities-point",
          type: "circle",
          source: "activities",
          paint: {
            // increase the radius of the circle as the zoom level and dbh value increases
            'circle-radius': {
              property: 'dbh',
              type: 'exponential',
              stops: [
                [{ zoom: 15, value: 1 }, 5],
                [{ zoom: 15, value: 62 }, 10],
                [{ zoom: 22, value: 1 }, 20],
                [{ zoom: 22, value: 62 }, 50],
              ]
            },
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'mag'],
              1, 'rgba(124,155,57,0)',
              2, 'rgb(168,209,156)',
              3, 'rgb(164,175,87)',
              4, 'rgb(164,205,57)',
              5, 'rgb(94,225,22)',
              6, 'rgb(82, 210, 16)'
            ],
            'circle-opacity': {
              stops: [
                [14, 0],
                [15, 1]
              ]
            }
          },
        },
        "admin-1-boundary-bg"
        );
    
        if (showPopup) {
          map.on("click", "activities-point", function (e) {
            var coordinates = e.features[0].geometry.coordinates.slice();
            var description = e.features[0].properties.description;
  
            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
  
            ShowPopup(coordinates, description, map);
  
            // Change the cursor to a pointer when the mouse is over the places layer.
            map.on("mouseenter", "activities-point", function () {
              map.getCanvas().style.cursor = "pointer";
            });
  
            // Change it back to a pointer when it leaves.
            map.on("mouseleave", "activities-point", function () {
              map.getCanvas().style.cursor = "";
            });
          });
        }
};

function Add3DModels(map) {
    let layerIndex = 1;
        map.addLayer({
            id: "3d-model-" + layerIndex,
            type: "custom",
            renderingMode: "3d",
            onAdd: function (map, gl) {
              window.tb = new Threebox(
                map,
                gl, //get the context from Mapbox
                { defaultLights: true }
              );
    
              var options = {
                obj: "/Models/3D/tree-1/scene.gltf",
                type: "gltf",
                scale: 5,
                units: "meters",
                rotation: { x: 90, y: Math.floor(Math.random() * 359), z: 0 },
              };
    
              //var destination, line;
              var trees = [];
    
              tb.loadObj(options, function (model) {
                data.regions.forEach(function (value, index) {
                  value.Activities.filter((activity) => activity.Show).forEach(function (activity, i) {
                    var coordinates = corrected_coords[value.Name];
    
                    if (i > 0) {
                      coordinates[0] += (Math.random() * 2 - 1) * ((Math.random() * 0.02) + 0.005);
                      coordinates[1] += (Math.random() * 2 - 1) * ((Math.random() * 0.02) + 0.005);
                    }
                    var tree = trees[value.Name] = model.duplicate()
                      .setCoords(coordinates);
    
                    tree.rotation = [
                      90,
                      Math.floor(Math.random() * 359),
                      0,
                    ];
    
                    tb.add(tree);
                  });
                });
              });
            },
            render: function (gl, matrix) {
              tb.update(); //update Threebox scene
            },
          });
};