$(document).ready(async () => {
    $("input#manage-auth-password").keypress((e) => { 
  
        // Enter key corresponds to number 13 
        if (e.which === 13) { 
            $('.manage-auth-button').click();
        } 
    });

    var rights = localStorage.getItem("rights");

    if (rights) {
        var res = await CheckPassword(rights);

        localStorage.removeItem("rights");

        if (res.result == "correct") {
            ShowAdminUI(res, rights);

            delete rights;
        }
    }
});

async function TryAuthorizing() {
    let password = $("input#manage-auth-password").val();

    var encryptedPassword = await EncryptPassword(password);
    delete password;

    if (encryptedPassword === "failure!") {
        return;
    }

    var res = await CheckPassword(encryptedPassword);

    if (res.result == "correct") {
        ShowAdminUI(res, encryptedPassword);

        delete encryptedPassword;

        $("input#manage-auth-password").val('');

        ShowToast({ Type: res.Type, body: res.body, duration: res.duration });
    } else {
        ShowToast({ Type: res.Type, body: res.body, duration: res.duration });
    }
};

function ShowAdminUI(res, encryptedPassword) {
    $(".manage-login").hide();

    var ui = $('.manage-ui');
    ui.append(res.data);

    AddActivityForm(window.map);

    $(".add-activity-form-options").append(
        "<button type=\"button\" class=\"btn return-to-manage-button ivn-background-color\"><i class=\"fas fa-long-arrow-alt-left\"></i> Terug naar beheer</button>"
    );

    $(".return-to-manage-button").on('click', function (e) {
        MenuChanged('manage-menu');
    });

    $(".edit-activities-button").on('click', function (e) {
        var button = $(e.target);

        let toEditMode = !(button.attr('data-editing') === 'true' ? true : false);

        if (toEditMode) {
            button.empty();
            button.remove('i.fas');
            button.removeClass('ivn-background-color');
            button.addClass('btn-warning');
            button.append(
                '<i class=\"fas fa-long-arrow-alt-left\"></i> Stop aanpassen'
            );
            button.attr('data-editing', 'true');
        } else {
            button.empty();
            button.remove('i.fas');
            button.removeClass('btn-warning');
            button.addClass('ivn-background-color');
            button.append(
                '<i class=\"fas fa-pen\"></i> Aanpassen'
            );
            button.attr('data-editing', 'false');
        }

        var manageTextElements =  $(".manage-text");

        manageTextElements.each(function (i, element) {
            var textElement = $(element);
            if (toEditMode) {
                textElement.css('display', 'none');
            } else {
                textElement.css('display', 'block');
            }
        });

        var manageInputs = $(".manage-input");

        manageInputs.each(function (i, element) {
            var input = $(element);

            if (input.hasClass("show-activity-checkbox")) return;

            if (input.attr('hidden')) {
                input.removeAttr('hidden');
            } else {
                input.attr('hidden', '');
            }
        });


    });

    $(".remove-activity-button").on('click', function (e) {
        var button = $(e.target);
        var id = button.attr('data-id');

        var val = $("#input_" + id + ".remove-activity-input").val();

        if (val === "true") {
            $("#input_" + id + ".remove-activity-input").val("false");
            $("#row_" + id).css('background-color', 'white');
            button.empty();
            button.remove('i.fas');
            button.removeClass('btn-success');
            button.addClass('btn-danger');
            button.append(
                '<i class=\"fas fa-trash\"></i> Verwijder'
            );
        } else {
            $("#input_" + id + ".remove-activity-input").val("true");
            $("#row_" + id).css('background-color', 'lightgray');
            button.empty();
            button.remove('i.fas');
            button.removeClass('btn-danger');
            button.addClass('btn-success');
            button.append(
                '<i class=\"fas fa-undo\"></i> Ongedaan maken'
            );
        }
    });

    $(".manage-input").on('keyup change', function (e) {
        window.manageInputsChanged = true;
    });

    $(".manage-data-submit-button").on('click', function (e) {
        window.manageInputsChanged = false;
    });

    $(".refresh-activities-button").on('click', async function (e) {
        if (window.manageInputsChanged) {
            $("form#manage-data-form").submit();

            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            };
    
            while (window.manageDataSubmitted == false) {
                await sleep(50);
            }

            window.manageDataSubmitted = false;
        }

        localStorage.setItem("rights", encryptedPassword);

        window.location.reload();
    });

    fixFormSubmit();

    ui.show();
};

function EncryptPassword(password) {
    return new Promise((resolve, reject) => {
        try {
            let url = "/encrypt";

            var data = {
                password: password
            }

            $.post(
                url,
                data,
                function(res) { 
                    res = JSON.parse(res);

                    if (res.result) {
                        resolve(res.result);
                    } else {
                        reject(res);
                    }
                }
            );
        } catch (e) {
            reject(e);
        }
    });
};

function CheckPassword(password) {
    return new Promise((resolve, reject) => {
        try {
            let url = "/check-password";

            var data = {
                password: password
            }

            $.post(
                url,
                data,
                function(res) {
                    resolve(JSON.parse(res));
                }
            );
        } catch (e) {
            reject(e);
        }
    });
};