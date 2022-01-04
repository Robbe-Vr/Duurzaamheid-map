const express = require('express');
var serveIndex = require('serve-index');
const qs = require('querystring');
const fs = require('fs');
var unirest = require("unirest");

require("dotenv").config();

const PORT = 7007;

const jsonDataFilePath = './data.json';

var app = express();

app.use(express.urlencoded({
    extend: false
}));
app.use(express.json());

app.use(express.static(__dirname + '/public'));

app.use('/js/modes', serveIndex(__dirname + '/public/js/modes'));

app.get('/data', async (req, res) => {
    var jsonObj = await readJsonFile();

    var data = JSON.stringify(jsonObj);

    res.end(data);
});

const toastMessageTypes = {
    0: "success",
    "success": 0,
    1: "warning",
    "warning" : 1,
    2: "error",
    "error": 2,
    3: "info",
    "info": 3,
    4: "question",
    "question": 4
};

Object.freeze(toastMessageTypes);

function readJsonFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(jsonDataFilePath, function (err, data) {
            if (err) {
                console.log(err);
                reject(err.message);
            }

            var json = JSON.parse(data);

            resolve(json);
        });
    });
};

app.post('/submit-action', async (req, res) => {
    
    if (req.body && req.body.Action && req.body.Name && req.body.Place) {
        var result = await addToJsonFile(req.body.Place, req.body.Name, req.body.Action, req.body.Description, req.body.hasOnsIvnAccount, req.body.OnsIvnAccount);
        if (result[0]) {
            res.end(JSON.stringify({ Type: result[1], body: result[2], duration: result[3] }, null, 2));
            return;
        } else {
            res.end(JSON.stringify({ Type: result[1], body: result[2], duration: result[3] }, null, 2));
            return;
        }
    }
    
    res.end(JSON.stringify({ Type: toastMessageTypes[toastMessageTypes.error], body: "Verzonden gegevens zijn incorrect!", duration: 3000 }, null, 2));
});

app.post('/manage-data', async (req, res) => {
    if (req.body && req.body.regions && req.body.regions.length && req.body.regions.length > 0 &&
        req.body.regions[0].Name && req.body.regions[0].Activities && req.body.regions[0].Activities.length) {
        var result = overwriteJsonData(req.body);
        if (result[0]) {
            res.end(JSON.stringify({ Type: result[1], body: result[2], duration: result[3] }, null, 2));
            return;
        } else {
            res.end(JSON.stringify({ Type: result[1], body: result[2], duration: result[3] }, null, 2));
            return;
        }
    }
    if (req.body.regions) {
        req.body.regions.forEach((region) => {
            console.log(region);
        });
    } else {
        console.log(req.body);
    }
    res.end(JSON.stringify({ Type: toastMessageTypes[toastMessageTypes.error], body: "Verzonden gegevens zijn incorrect!\nData wordt niet overschreven!.", duration: 3000 }, null, 2));
});

function overwriteJsonData(newJson) {
    console.log(newJson);
    var message = "Onbekende status.";

    if (newJson.regions.length < 1 || !checkRegions(newJson)) {
        message = "Verzonden gegevens zijn incorrect!\nData wordt niet overschreven!";
        return [false, toastMessageTypes[toastMessageTypes.error], message, 3000];
    }

    newJson.regions.forEach((region) => {
        region.Coordinates[0] = parseFloat(region.Coordinates[0]);
        region.Coordinates[1] = parseFloat(region.Coordinates[1]);

        region.Activities.forEach((activity) => {
            activity.Show = activity.Show === "true" ? true : false;
            activity.HasOnsIvnAccount = activity.HasOnsIvnAccount === "true" ? true : false;
        });
    });

    fs.writeFileSync(jsonDataFilePath, JSON.stringify(newJson, null, 4));

    message = "Data succesvol verzonden!";

    return [true, toastMessageTypes[toastMessageTypes.success], message, 3000];
};

function checkRegions(data) {
    let correctData = true;

    data.regions.forEach(function (region, index) {
        if (region.Activities.length < 1) {
            correctData = false;
        }
    });

    return correctData;
};

app.post('/encrypt', (req, res) => {
    if (!(req.body && req.body.password && req.body.password.length > 1)) {
        console.log(req.body);
        res.end("failure!");
        return;
    }

    console.log("password attempt: " + req.body.password);

    let hashed_value = Hash(req.body.password);

    res.end(JSON.stringify({ result: hashed_value }, null, 2));
});

app.post('/check-password', async (req, res) => {
    var response = ["Fout wachtwoord!\nGeen toegang!"];

    if (!(req.body && req.body.password && req.body.password.length > 1)) {
        console.log(req.body);
        res.end(JSON.stringify({ Type: toastMessageTypes[toastMessageTypes.warning], body: response[0], duration: 3000 }, null, 2));
        return;
    }

    var correct_hash = Hash(process.env.DM_PASSWORD);

    if (correct_hash === req.body.password) {
        var result = "correct";

        var body = await GetManageUI();

        res.end(JSON.stringify({ Type: toastMessageTypes[toastMessageTypes.success], body: "Succesvol ingelogd!", duration: 3000, data: body, result: result }, null, 2));
        return;
    }

    res.end(JSON.stringify({ Type: toastMessageTypes[toastMessageTypes.warning], body: response[0], duration: 3000 }, null, 2));
});

function Hash(unencrypted_value) {
    var crypto = require('crypto');

    var hash = crypto.createHash('sha512', process.env.DM_SECRET);

    hash_data = hash.update(unencrypted_value, 'utf-8');

    gen_hash= hash_data.digest('hex');

    return gen_hash;
};

async function GetManageUI() {
    data = await readJsonFile();

    var manageUI =
    "<div class=\"manage-data-panel\">" +
        "<div class=\"row height-inherit undo-row-margins\">" +
            "<div class=\"col-10 height-inherit\">" +
                "<div class=\"manage-data-container\">" +
                    "<form action=\"manage-data\" id=\"manage-data-form\" method=\"POST\">" +
                        "<table class=\"table\">" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>" +
                                        "Kies welke activiteiten op de map verschijnen" +
                                    "</th>" +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";

    data.regions.forEach(function (region, index) {
        manageUI +=
                                "<tr>" +
                                    "<td>" +
                                        "<table class=\"table\" id=\"" + region.Name + "\">" +
                                            "<colgroup>" +
                                                "<col span=\"1\" style=\"width: 10%\">" +
                                                "<col span=\"1\" style=\"width: 25%\">" +
                                                "<col span=\"1\" style=\"width: 15%\">" +
                                                "<col span=\"1\" style=\"width: 32%\">" +
                                                "<col span=\"1\" style=\"width: 13%\">" +
                                                "<col span=\"1\" style=\"width: 5%\">" +
                                            "</colgroup>" +
                                            "<thead class=\"head_row_" + index + "\">" + 
                                                "<tr>" +
                                                    "<th>" + 
                                                        region.Name + "<br /><i class=\"fas fa-chevron-circle-down collapsed\"></i>" +
                                                        "<input type=\"text\" name=\"regions[" + index + "].Name\" id=\"regions[" + index + "].Name\" value=\"" + region.Name + "\" hidden />" +
                                                        "<input type=\"number\" name=\"regions[" + index + "].Coordinates[0]\" id=\"regions[" + index + "].Coordinates[0]\" value=\"" + region.Coordinates[0] + "\" hidden />" +
                                                        "<input type=\"number\" name=\"regions[" + index + "].Coordinates[1]\" id=\"regions[" + index + "].Coordinates[1]\" value=\"" + region.Coordinates[1] + "\" hidden />" +
                                                    "</th>" +
                                                    "<th></th>" +
                                                    "<th></th>" +
                                                    "<th></th>" +
                                                    "<th></th>" +
                                                    "<th></th>" +
                                                "</tr>" +
                                            "</thead>" +
                                            "<thead class=\"row_" + index + "\">" + 
                                                "<tr>" +
                                                    "<th>Zichtbaar?</th>" +
                                                    "<th>Activiteit</th>" +
                                                    "<th>Naam</th>" +
                                                    "<th>Uitleg</th>" +
                                                    "<th>Ons IVN</th>" +
                                                    "<th>Verwijderen?</th>" +
                                                "</tr>" +
                                            "</thead>" +
                                            "<tbody class=\"row_" + index + "\">";

        region.Activities.forEach(function (activity, i) {
            let onsIvn = "<td>" + (activity.HasOnsIvnAccount ? 
                "<text class=\"manage-text\"><a class=\"text-decoration-none\" " +
                    "target=\"_blank\" href=\"https://ons.ivn.nl/zoeken?facets=%7B%22typeName%22%3A%5B%22iris_iris_IntranetUserProfile%22%5D%7D&q=" + activity.OnsIvnAccount.replace(/ /g, "%20") + "&cm_lg=nl" + "\">" + activity.OnsIvnAccount + "</a></text><br />" +
                "<label for=\"regions[" + index + "].Activities[" + i + "].HasOnsIvnAccount\" class=\"manage-input\" hidden>Heeft een <a class=\"text-decoration-none\" target=\"_blank\" href=\"https://ons.ivn.nl/\">ons.ivn</a> account: </label>" +
                "<input type=\"checkbox\" checked class=\"activity-checkbox manage-input\" name=\"regions[" + index + "].Activities[" + i + "].HasOnsIvnAccount\" id=\"regions[" + index + "].Activities[" + i + "].HasOnsIvnAccount\" hidden />" +
                "<input type=\"text\" class=\"activity-input manage-input manage-text-input\" value=\"" + activity.OnsIvnAccount + "\" name=\"regions[" + index + "].Activities[" + i + "].OnsIvnAccount\" id=\"regions[" + index + "].Activities[" + i + "].OnsIvnAccount\" hidden />"
                : "-") + "</td>";

            manageUI +=
                                                "<tr id=\"row_region_" + index + "_act_" + i + "\">" +
                                                    "<td>" +
                                                        "<label for=\"regions[" + index + "].Activities[" + i + "].Show\">Zichtbaar: </label>" +
                                                        "<input type=\"checkbox\" class=\"show-activity-checkbox activity-checkbox show-on-map-checkbox manage-input\" name=\"regions[" + index + "].Activities[" + i + "].Show\" id=\"regions[" + index + "].Activities[" + i + "].Show\"" + (activity.Show ? " checked" : "") + " />" +
                                                    "</td>" +
                                                    "<td>" +
                                                        "<text class=\"manage-text\">" + activity.Activity + "</text><br />" +
                                                        "<input type=\"text\" class=\"activity-input manage-input manage-text-input\" value=\"" + activity.Activity + "\" name=\"regions[" + index + "].Activities[" + i + "].Activity\" id=\"regions[" + index + "].Activities[" + i + "].Activity\" hidden />" +
                                                    "</td>" +
                                                    "<td>" +
                                                        "<text class=\"manage-text\">" + activity.Name + "</text><br />" +
                                                        "<input type=\"text\" class=\"activity-input manage-input manage-text-input\" value=\"" + activity.Name + "\" name=\"regions[" + index + "].Activities[" + i + "].Name\" id=\"regions[" + index + "].Activities[" + i + "].Name\" hidden />" +
                                                    "</td>" +
                                                    "<td>" +
                                                        "<text class=\"manage-text\">" + activity.Description + "</text><br />" +
                                                        "<textarea type=\"text\" class=\"activity-input manage-input manage-text-input\" maxlength=\"200\" minlength=\"2\" placeholder=\"beschrijf je actie\" " +
                                                            "name=\"regions[" + index + "].Activities[" + i + "].Description\" id=\"regions[" + index + "].Activities[" + i + "].Description\" hidden" +
                                                            "rows=\"5\" style=\"resize: none;\" onkeyup=\"CountChars(this, '" + index + "_" + i + "')\" hidden>" + activity.Description + "</textarea>" +
                                                        "<div class=\"manage-input manage-text-input\" id=\"charNum_" + index + "_" + i + "\" style=\"margin-left: 12px;\" hidden>" + activity.Description.length + " / 200</div>" +
                                                    "</td>" +
                                                    onsIvn +
                                                    "<td>" +
                                                        "<button type=\"button\" data-id=\"region_" + index + "_act_" + i + "\" id=\"button_region_" + index + "_act_" + i + "\" class=\"btn btn-danger remove-activity-button\"><i class=\"fas fa-trash\"></i> Verwijder</button>" +
                                                        "<input type=\"text\" class=\"remove-activity-input\" id=\"input_region_" + index + "_act_" + i + "\" name=\"regions[" + index + "].Activities[" + i + "].Remove\" value=\"false\" hidden />" +
                                                    "</td>" +
                                                "</tr>";
        });

        manageUI +=
                                            "</tbody>" +
                                        "</table>" +
                                        "<script type=\"text/javascript\">" +
                                            "var tableBody_" + index + " = $(\".row_" + index + "\")," +
                                            "tableHead_" + index + " = $(\".head_row_" + index + "\");" +
                    
                                            "tableHead_" + index + ".on(\"click\", function () {" +
                                                "if (tableBody_" + index + ".css('display') === 'none') {" +
                                                    "tableBody_" + index + ".css('display', 'table-row-group');" +
                                                    "var iEl = tableHead_" + index + ".find('tr th i');" +
                                                    "iEl.removeClass(" +
                                                        "'fa-chevron-circle-up'" +
                                                    ");" +
                                                    "iEl.addClass(" +
                                                        "'fa-chevron-circle-down'" +
                                                    ");" +
                                                "} else {" +
                                                    "tableBody_" + index + ".css('display', 'none');" +
                                                    "var iEl = tableHead_" + index + ".find('tr th i');" +
                                                    "iEl.removeClass(" +
                                                        "'fa-chevron-circle-down'" +
                                                    ");" +
                                                    "iEl.addClass(" +
                                                        "'fa-chevron-circle-up'" +
                                                    ");" +
                                                "}" +
                                            "});" +
                                        "</script>" +
                                    "</td>" +
                                "</tr>";
        });

    manageUI +=
                            "</tbody>" +
                        "</table>" +
                        "<div>" +
                            "<button type=\"submit\" class=\"btn manage-data-submit-button ivn-background-color\"><i class=\"fas fa-check-circle\"></i> Aanpassingen bevestigen</button>" +
                        "</div>" +
                    "</form>" +
                "</div>" +
            "</div>" +
            "<div class=\"col-2 manage-options-panel\">" +
                "<button class=\"btn add-activity-button ivn-background-color\" style=\"margin-left: 0;\" ><i class=\"fas fa-plus\"></i> Activiteit toevoegen</button>" +
                "<button class=\"btn edit-activities-button ivn-background-color\" data-editing=\"false\" style=\"margin-left: 0;\"><i class=\"fas fa-pen\"></i> Aanpassen</button>" +
                "<button class=\"btn refresh-activities-button ivn-background-color\" style=\"margin-left: 0;\"><i class=\"fas fa-sync-alt\"></i> Kaart updaten</button>" +
            "</div>" +
        "</div>" +
    "</div>";

    return manageUI;
};

async function addToJsonFile(region, person, activity, description, hasOnsIvnAccount, onsIvnAccount) {
    let message = "onbekende status.";

    let regionName = region.split(',')[0];

    if (!region || !regionName || !person ||
        !activity || activity.length < 2 ||
        !description || description.length < 2)
    {
        message = "Onvoldoende velden zijn ingevoerd!";
        return [false, toastMessageTypes[toastMessageTypes.error], message, 3000];
    }

    if (!onsIvnAccount || onsIvnAccount.length < 1) {
        hasOnsIvnAccount = false;
        onsIvnAccount = "";
    }

    var currentJson = { regions: [{ Name: "", Coordinates: [], Activities: [{ Name:"", Activity: '', Description: '', hasOnsIvnAccount: false, OnsIvnAccount: '', show: false } ] } ] };
    currentJson.regions = [];
    
    currentJson = await readJsonFile();

    var Region = currentJson.regions.find((indexRegion) => regionName === indexRegion.Name);

    if (!Region) {
        Region = {
            Name: regionName,
            Coordinates: await getCoordsForRegion(region),
            Activities: [
                {
                    Name: person,
                    Activity: activity,
                    Description: description,
                    HasOnsIvnAccount: hasOnsIvnAccount,
                    OnsIvnAccount: onsIvnAccount,
                    show: false
                }
            ]
        };

        currentJson.regions.push(Region);

        message = "Activiteit toegevoegd!";
    }
    else {
        if (!currentJson.regions.find((indexRegion) => regionName === indexRegion.Name)
            .Activities.find((indexActivity) => indexActivity.Name == person && indexActivity.Activity == activity))
        {
            currentJson.regions.find((indexRegion) => regionName === indexRegion.Name)
                .Activities.push({ Name: person, Activity: activity, Description: description,
                    hasOnsIvnAccount: hasOnsIvnAccount, OnsIvnAccount: onsIvnAccount, show: false });
            message = "Activiteit toegevoegd!";
        } else {
            message = "Deze activiteit bestaat al!";
            return [false, toastMessageTypes[toastMessageTypes.warning], message, 3000];
        }
    }

    console.log(currentJson);

    fs.writeFileSync(jsonDataFilePath, JSON.stringify(currentJson, null, 4));

    return [true, toastMessageTypes[toastMessageTypes.success], message, 3000];
};

async function getCoordsForRegion(region) {
    return new Promise((resolve, reject) => {
        let accessToken = "pk.eyJ1Ijoicm9iYmV2IiwiYSI6ImNraTBmMWIwYTI3aWoyc3A1ZWthNDRxaW8ifQ.0UpEACtyPkQzp8Aw1oaAUQ";

        const https = require('https');
        const options = {
            hostname: 'api.mapbox.com',
            port: 443,
            path: '/geocoding/v5/mapbox.places/' + region.replace(/, /g, ',').replace(/ /g, '%20') + '.json?access_token=' + accessToken,
            method: 'GET'
        };

        const req = https.request(options, res => {
            console.log(`statusCode: ${res.statusCode}`);

            res.on('data', d => {
                process.stdout.write(d);

                var jsonString = String.fromCharCode.apply(null, d);

                var json = JSON.parse(jsonString);

                resolve(json.features[0].geometry.coordinates);
            });
        });

        req.on('error', error => {
            console.error(error);

            reject(error);
        });

        req.end();
    });
};

console.log("App online on: http://localhost:" + PORT);
app.listen(PORT);