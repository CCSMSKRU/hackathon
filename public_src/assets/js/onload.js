/**
 * onload.js - complex cloud solutions, LLC
 *
 * document.ready functions
 */

$('document').ready(function(){

    //parse url
    (function(){
        var href = document.location.href;

        var vars = getUrlVars(href);

        console.log(vars)
        switch (vars.co) {
            case 'technical_card':
                var formId = MB.Core.guid();
                var o = {
                    class: "equipment",
                    client_object: "form_equipment",
                    ids :[vars.id],
                    name: "form_equipment",
                    type: 'form'
                };

                var form = new MB.FormN(o);
                form.create(function () {
                });

                break;

            default:
                break;
        }
    }());


    /**
     * Opon form_user, top right user block.
     */
    $('#user-block-holder').off('click').on('click', function(){

        var formId = MB.Core.guid();
        var user_id = $(this).attr('data-id');


        var o = {
            class: "user",
            client_object: "form_user",
            ids :[user_id],
            name: "form_user",
            position: "center",
            tablePKeys: {
                data: [user_id],
                data_columns: ['id'],
            },
            type: 'form'
        };

        var form = new MB.FormN(o);
        form.create(function () {

        });


    });

    $('#organization-block-holder').off('click').on('click', function(){

        return;

        // var formId = MB.Core.guid();
        // var user_id = MB.User.id;
        //
        //
        // var o = {
        //     class: "user",
        //     client_object: "form_user",
        //     ids :[user_id],
        //     name: "form_user",
        //     position: "center",
        //     tablePKeys: {
        //         data: [user_id],
        //         data_columns: ['id'],
        //     },
        //     type: 'form'
        // };
        //
        // var form = new MB.FormN(o);
        // form.create(function () {
        //
        // });


    });


    /**
     * set user data to top right user block
     */
    (function(){




        // var o = {
        //     command:'get_me',
        //     object:'User',
        //     params:{
        //         getRoles:true
        //     }
        // };
        //
        //
        //
        // socketQuery(o, function(res){
        //     MB.User = res.user;
        //
        //
        // });

    }());




});
