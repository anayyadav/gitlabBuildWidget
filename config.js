/**
 * Build widget configuration
 */
(function () {
    'use strict';
    angular
        .module(HygieiaConfig.module)
        .controller('BuildGitlabWidgetConfigController', BuildGitlabWidgetConfigController);
    BuildGitlabWidgetConfigController.$inject = ['modalData', '$scope', 'gitlabbuild', '$uibModalInstance'];
    function BuildGitlabWidgetConfigController(modalData, $scope, gitlabbuild, $uibModalInstance) {
        var ctrl = this,
        widgetConfig = modalData.widgetConfig;
        ctrl.buildDurationThreshold = 3;
        ctrl.buildConsecutiveFailureThreshold = 5;
        ctrl.selectappname = null;
        ctrl.gitlabBuildUniqueIds = {
            appname: [],
            selectappname: ''
        };
        
		if (widgetConfig) {
            if (widgetConfig.options.buildDurationThreshold) {
                ctrl.buildDurationThreshold = widgetConfig.options.buildDurationThreshold;
            }
            if (widgetConfig.options.consecutiveFailureThreshold) {
                ctrl.buildConsecutiveFailureThreshold = widgetConfig.options.consecutiveFailureThreshold;
            }
        }
		
        ctrl.load = function () {
			console.log(gitlabbuild)
            gitlabbuild.details(widgetConfig.options.id).
                then(function (data) {
                    ctrl.gitlabBuildUniqueIds.appname = [...new Set(data.data[0].gitlabBuild.map(item => item.projectName))];
                    
                })
        };


        ctrl.submit = submitForm;


        function submitForm(valid, collector) {
            if (valid) {
                $scope.$emit('eventEmitedName');
                var form = document.buildConfigForm;
                var postObj = {
                    name: 'build',
                    options: {
                        id: widgetConfig.options.id,
						buildDurationThreshold: parseFloat(form.buildDurationThreshold.value),
                        consecutiveFailureThreshold: parseFloat(form.buildConsecutiveFailureThreshold.value),
                        appname: ctrl.selectappname
                    },
                    componentId: modalData.dashboard.application.components[0].id
                };
                // pass this new config to the modal closing so it's saved
                $uibModalInstance.close(postObj);
            }
        }
    }
})();
