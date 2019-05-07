/**
 * View controller for the build widget
 */
(function () {
    'use strict';

    angular
        .module(HygieiaConfig.module)
        .controller('BuildGitlabWidgetViewController', BuildGitlabWidgetViewController);

    BuildGitlabWidgetViewController.$inject = ['$scope', 'gitlabData', 'DisplayState', '$q', '$uibModal'];
    function BuildGitlabWidgetViewController($scope, gitlabData, DisplayState, $q, $uibModal) {
        var ctrl = this;
        var builds = [];

        //region Chart Configuration
        // line chart config

        ctrl.lineOptions = {
            plugins: [
                Chartist.plugins.gridBoundaries(),
                Chartist.plugins.lineAboveArea(),
                Chartist.plugins.tooltip(),
                Chartist.plugins.pointHalo()
            ],
            showArea: true,
            lineSmooth: false,
            fullWidth: true,
            chartPadding: 7,
            axisX: {
				showLabel: false,
				textAnchor: 'middle'
            },
            axisY: {
                labelInterpolationFnc: function(value) {
                    return value === 0 ? 0 : ((Math.round(value * 100) / 100) + '');
                }
            }
        };

        // bar chart config
        ctrl.buildDurationOptions = {
            plugins: [
                Chartist.plugins.threshold({
                    threshold: $scope.widgetConfig.options.buildDurationThreshold || 10
                }),
                Chartist.plugins.gridBoundaries(),
                Chartist.plugins.tooltip(),
                Chartist.plugins.axisLabels({
                    stretchFactor: 1.4,
                    axisX: {
                        labels: [
                            moment().subtract(14, 'days').format('MMM DD'),
                            moment().subtract(7, 'days').format('MMM DD'),
                            moment().format('MMM DD')
                        ]
                    }
                })
            ],
            stackBars: true,
            centerLabels: true,
            axisY: {
                offset: 30,
                labelInterpolationFnc: function(value) {
                    return value === 0 ? 0 : ((Math.round(value * 100) / 100) + '');
                }
            }
        };

        ctrl.buildDurationEvents = {
            'draw': draw
        };
        //endregion

        ctrl.load = function() {
            var deferred = $q.defer();
            var params = {
                componentId: $scope.widgetConfig.componentId,
                numberOfDays: 15
            };
            gitlabData.details(params).then(function(data) {
                builds = data.data[0].gitlabBuild.filter(function (item) {
                    return item.projectName == $scope.widgetConfig.options.appname;
                });
				
				//console.log(builds)
                processResponse(builds);
                deferred.resolve(data.lastUpdated);
            });
            return deferred.promise;
        };

        ctrl.open = function (url) {
            window.open(url);
        };

        ctrl.detail = function(build) {
            $uibModal.open({
                templateUrl: 'components/widgets/gitlabbuild/detail.html',
                controller: 'BuildWidgetDetailController',
                controllerAs: 'detail',
                size: 'lg',
                resolve: {
                    build: function() {
                        return _.find(builds, { number: build.number });
                    }
                }
            });
        };

        // creates the two-color point design
        // the custom class, 'ct-point-halo' can be used to style the outline
        function draw(data) {
		
            if (data.type === 'bar') {
                if (data.value.y > 0) {
                    data.group.append(new Chartist.Svg('circle', {
                        cx: data.x2,
                        cy: data.y2,
                        r: 7
                    }, 'ct-slice-pie'));
                    data.y2 -= 7;
                }
            }

            if (data.type === 'point') {
                data.group.append(new Chartist.Svg('circle', {
                    cx: data.x,
                    cy: data.y,
                    r: 3
                }, 'ct-point-halo'), true);
            }
        }

        //region Processing API Response
        function processResponse(data) {
            var worker = {
                    averageBuildDuration: averageBuildDuration,
                    buildsPerDay: buildsPerDay,
                    latestBuilds: latestBuilds,
                    setDisplayToErrorState: setDisplayToErrorState,
                    totalBuilds: totalBuilds
                };

            //region web worker method implementations
            function averageBuildDuration(data, buildThreshold, cb) {
					
					
                cb({
                    series: getSeries()
                });

                function getSeries() {
                    var result = getPassFail(simplify(group(filter(data))));
                    return [
                        result.passed,
                        result.failed
                    ];
                }

                // filter to successful builds in the last 15 days
                function filter(data) {
                    return _.filter(data, function (item) {
					var eDate = new Date(item.endTime);
                        return item.buildStatus == 'success' && Math.floor(moment(eDate).endOf('day').diff(moment(new Date()).endOf('day'), 'days')) >= -15;
                    });
                }

                function group(data) {
                    return _.groupBy(data, function (item) {
					var eDate = new Date(item.endTime);
                        return moment(eDate).format('L');
                    });
                }

                function simplify(data) {
                    // create array with date as the key and build duration times in an array
                    var simplifiedData = {};
                    _.forEach(data, function (buildDay, key) {
                        if (!simplifiedData[key]) {
                            simplifiedData[key] = [];
                        }

                        _.forEach(buildDay, function (build) {
							var eDate = new Date(build.endTime);
							var sDate = new Date(build.startTime);
                            var duration = moment(eDate).diff(moment(sDate), 'seconds') / 60;
                            simplifiedData[key].push(duration);
                        });
                    });

                    return simplifiedData;
                }

                function getPassFail(simplifiedData) {
                    // loop through all days in the past two weeks in case there weren't any builds
                    // on that date
                    var passed = [], failed = [];
                    for (var x = 0; x <= 14; x++) {
                        var date = moment(new Date()).subtract(x, 'days').format('L');
                        var data = simplifiedData[date];

                        // if date has no builds, add 0,0
                        if (!data || !data.length) {
                            passed.push(0);
                            failed.push(0);
                        }
                        else {
                            // calculate average and put in proper
                            var avg = _(data).reduce(function(a,b) {
                                    return a + b;
                                }) / data.length;

                            if (avg > buildThreshold) {
                                passed.push(0);
                                failed.push(avg);
                            }
                            else {
                                passed.push(avg);
                                failed.push(0);
                            }
                        }
                    }

                    return {
                        passed: passed.reverse(),
                        failed: failed.reverse()
                    };
                }
            }

            function buildsPerDay(data, cb) {
				//console.log(data)
                var fifteenDays = toMidnight(new Date());
                fifteenDays.setDate(fifteenDays.getDate() - 14);
                cb({
                    passed: countBuilds(all(data)),
                    failed: countBuilds(failed(data))
                });

                function all(data) {
                    return _.filter(data, function (build) {
						var eDate = new Date(build.endTime);
                        return eDate >= fifteenDays.getTime() && (build.buildStatus !== 'failed');
                    });
                }

                function failed(data) {
                    return _.filter(data, function (build) {
					var eDate = new Date(build.endTime);
                        return eDate >= fifteenDays.getTime() && (build.buildStatus !== 'success');
                    });
                }

                function countBuilds(data) {
                    var counts = [];
                    var dt = new Date(fifteenDays.getTime());
                    var grouped = _.groupBy(data, function (build) {
                        return toMidnight(new Date(build.endTime)).getTime();
                    });

                    _.times(15, function () {
                        var count = grouped[dt.getTime()] ? grouped[dt.getTime()].length : 0;
                        counts.push(count);
                        dt.setDate(dt.getDate() + 1);
                    });

                    return counts;
                }


                function toMidnight(date) {
                    date.setHours(0, 0, 0, 0);
                    return date;
                }
            }

            function latestBuilds(data, cb) {
                // order by end time and limit to last 5
                data = _.sortBy(data, 'endTime').reverse().slice(0, 5);

                // loop and convert time to readable format
                data = _.map(data, function (item) {
                    return {
                        status : item.buildStatus.toLowerCase(),
                        number: item.number,
                        endTime: item.endTime,
                        url: item.buildUrl
                    };
                });

                cb(data);
            }

            function setDisplayToErrorState(data, failureThreshold, cb) {
                // order by end time and limit to last 5
                data = _.sortBy(data, 'endTime').reverse().slice(0, failureThreshold);
                data = _.filter(data, function (item) {
                    return (item.buildStatus.toLowerCase() != 'success') &&  (item.buildStatus.toLowerCase() != 'failed') ;
                });

                cb(data && data.length >= failureThreshold);
            }

            function totalBuilds(data, cb) {
                var today = toMidnight(new Date());
                var sevenDays = toMidnight(new Date());
                var fourteenDays = toMidnight(new Date());

                sevenDays.setDate(sevenDays.getDate() - 7);
                fourteenDays.setDate(fourteenDays.getDate() - 14);

                cb({
                    today: countToday(),
                    sevenDays: countSevenDays(),
                    fourteenDays: countFourteenDays()
                });

                function countToday() {
                    return _.filter(data, function (build) {
					var eDate = new Date(build.endTime);
                        return eDate >= today.getTime();
                    }).length;
                }

                function countSevenDays() {
                    return _.filter(data, function (build) {
					var eDate = new Date(build.endTime);
                        return eDate >= sevenDays.getTime();
                    }).length;
                }

                function countFourteenDays() {
                    return _.filter(data, function (build) {
					var eDate = new Date(build.endTime);
                        return eDate >= fourteenDays.getTime();
                    }).length;
                }

                function toMidnight(date) {
                    date.setHours(0, 0, 0, 0);
                    return date;
                }
            }
            //endregion

            //region web worker calls
            // call to webworker methods nad set the controller variables with the processed values
            worker.buildsPerDay(data, function (data) {
                //$scope.$apply(function () {

                var labels = [];
				var d = new Date(); // today!
				var x = 15; // go back 5 days!
                _(data.passed).forEach(function() {
					x=x-1;
                    labels.push(moment(new Date()).subtract(x, 'days').format('L').slice(1, 5));
                });

                ctrl.lineData = {
                    labels: labels,
                    series: [{
                        name: 'success',
                        data: data.passed
                    }, {
                        name: 'failures',
                        data: data.failed
                    }]
                };
                //});
            });

            worker.latestBuilds(data, function (buildsToDisplay) {
                //$scope.$apply(function () {
                    ctrl.recentBuilds = buildsToDisplay;
                //});
            });

            worker.averageBuildDuration(data, $scope.widgetConfig.options.buildDurationThreshold, function (buildDurationData) {
                //$scope.$apply(function () {
                var labels = [];
                _(buildDurationData.series[0]).forEach(function() {
                    labels.push('');
                });
                buildDurationData.labels = labels;
                //_(buildDurationData.series).forEach
                ctrl.buildDurationData = buildDurationData;
                //});
            });

            worker.setDisplayToErrorState(data, $scope.widgetConfig.options.consecutiveFailureThreshold, function (displayAsErrorState) {
                //$scope.$apply(function () {
                    $scope.display = displayAsErrorState ? DisplayState.ERROR : DisplayState.DEFAULT;
                //});
            });

            worker.totalBuilds(data, function (data) {
                //$scope.$apply(function () {
                    ctrl.totalBuildsYesterday = data.today;
                    ctrl.totalBuildsLastWeek = data.sevenDays;
                    ctrl.totalBuildsLastMonth = data.fourteenDays;
                //});
            });
            //endregion
        }
        //endregion
    }
})();
