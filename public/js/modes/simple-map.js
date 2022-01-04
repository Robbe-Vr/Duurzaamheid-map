function initMapSimple() {

    const map = LoadMap({
        style: 'mapbox://styles/robbev/ckk6ow4nd0gnc17pef1f2jkxp',
    });
  
    map.on("style.load", async function () {
        data.regions = await retrieveMapDataFromSource();

        data.regions.filter(region => region.Activities.length > 0).forEach(function (value, index) {
            coords[value.Name] = [
                value.Coordinates[0],
                value.Coordinates[1]
            ];
            corrected_coords[value.Name] = [
                value.Coordinates[0] - 0.0232,
                value.Coordinates[1] - 0.0178,
            ];
            coords_3D[value.Name] = [
                value.Coordinates[0],
                value.Coordinates[1],
                0.0
            ];
        });

        AddMarkers(map, showPopup = true);

        ShowToast({ Type: 'success', body: 'Map succesvol ingeladen!', duration: 3000 });
    });
};