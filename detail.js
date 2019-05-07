/**
 * Detail controller for the build widget
 */
(function () {
    'use strict';

    angular
        .module(HygieiaConfig.module)
        .controller('BuildWidgetDetailController', BuildWidgetDetailController);

    BuildWidgetDetailController.$inject = ['$scope', '$uibModalInstance', 'build'];
    function BuildWidgetDetailController($scope, $uibModalInstance, build) {
        var ctrl = this;

        ctrl.build = build;
        
        ctrl.buildUrlNiceName = buildUrlNiceName;
        ctrl.buildPassed = buildPassed;
        ctrl.close = close;

        function buildUrlNiceName() {
            
                return "Gitlab";
            
        }

        

        function buildPassed() {
            return ctrl.build.buildStatus === 'success';
        }

        function close() {
            $uibModalInstance.dismiss('close');
        }
    }
})();
