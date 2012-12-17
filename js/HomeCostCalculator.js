window.HomeCostCalculator = (function($) {
	
	function initialize() {
		HomeCostCalculatorData.initialize(_init);
	}

	function _init() {
		initializeMonthlyPmtsCalc();
		initializeMaxLoanCalc();
		initializeTableGenerator();
		initializeSettings();

		$(document).on('pagebeforechange', function(event,data) {
			if(['monthly_pmts', 'table_gen'].indexOf(data.toPage[0].id) > -1) {
				$('span#utilCost').text(_formatAsCurrency(HomeCostCalculatorData.getEstUtilTotal()));
			}
			if(['table_gen'].indexOf(data.toPage[0].id) > -1) {
				$('form#table_form').show();
				$("table#table_display").hide();
			}
			HomeCostCalculatorData.saveData();
		});
	}

	function initializeMonthlyPmtsCalc() {
		$('form#monthly_pmts_calc input').on('blur', updateMonthlyPmtsTotals);
		$('form#monthly_pmts_calc select').on('change', updateMonthlyPmtsTotals);
		populateCommunities();
		$('span#utilCost').text(_formatAsCurrency(HomeCostCalculatorData.getEstUtilTotal()));
	}
	
	function updateMonthlyPmtsTotals() {
		var form = $('form#monthly_pmts_calc').serialize(true);
		var loanValue, monthlyPmt, otherMonthly, totalMonthly, tax, rate, nper;
		loanValue = _cleanNumber(form.homePrice) - _cleanNumber(form.downPmt);
		if(isNaN(loanValue))
			return;
		$('#loanVal').text(_formatAsCurrency(loanValue));
		rate = (_cleanNumber(form.apr) / 12) / 100;
		nper = form.loanTerm * 12;
		monthlyPmt = PMT(rate, nper, loanValue);
		if(isNaN(monthlyPmt)) 
			return;
		$('#monthlyLoanPmt').text(_formatAsCurrency(monthlyPmt));
		tax = calculateTax(_cleanNumber(form.homePrice), form.community);
		if(isNaN(tax))
			tax = 0;
		$('#estTax').text(_formatAsCurrency(tax));
		otherMonthly = _cleanNumber(form.hoa) + HomeCostCalculatorData.getEstUtilTotal() + (tax / 12);
		if(isNaN(otherMonthly))
			return;
		totalMonthly = monthlyPmt + otherMonthly;
		if(isNaN(totalMonthly))
			return;
		$('#totalMonthlyPmt').text(_formatAsCurrency(totalMonthly));
	}

	function initializeMaxLoanCalc() {
		$('form#max_loan_calc input').on('blur', updateMaxLoanTotals);
		$('form#max_loan_calc select').on('change', updateMaxLoanTotals);
	}

	function updateMaxLoanTotals() {
		var form = $('form#max_loan_calc').serialize(true);
		var monthlyIncome, monthlyDebt, debt2Income, maxPmt, rate, nper, maxLoan;
		switch(form.incomePer) {
			case 'year':
				monthlyIncome = _cleanNumber(form.income) / 12;
			break;
			case 'month':
				monthlyIncome = _cleanNumber(form.income);
			break;
			case 'week':
				monthlyIncome = _cleanNumber(form.income) * 4;
			break;
			default:
			return;
		}
		if(isNaN(monthlyIncome))
			return;
		monthlyDebt = _cleanNumber(form.debt);
		if(isNaN(monthlyDebt))
			return;
		debt2Income = _cleanNumber(form.d2i);
		if(isNaN(debt2Income))
			return;
		maxPmt = (monthlyIncome * debt2Income) - monthlyDebt;
		if(isNaN(maxPmt))
			return;
		$('#maxPmt').text(_formatAsCurrency(maxPmt));
		rate = _cleanNumber(form.estapr) / 12 / 100;
		if(isNaN(rate))
			return;
		nper = form.loanTerm * 12;
		maxLoan = ((Math.pow((1 + rate), nper) - 1) * maxPmt) / (rate * Math.pow((rate + 1), nper));
		if(isNaN(maxLoan)) 
			return;
		$('#maxLoanAmt').text(_formatAsCurrency(maxLoan));
	}

	function initializeTableGenerator() {
		$('form#table_form input#genTable').on('click', buildTable);
	}

	function buildTable() {
		var template = $('#table_template').text();
		var form = $('form#table_form').serialize(true);
		var monthlyIncome, monthlyDebt, debt2Income, rate, nper, pmtStart, pmtEnd, pmtStep;
		switch(form.incomePer) {
			case 'year':
				monthlyIncome = _cleanNumber(form.income) / 12;
			break;
			case 'month':
				monthlyIncome = _cleanNumber(form.income);
			break;
			case 'week':
				monthlyIncome = _cleanNumber(form.income) * 4;
			break;
			default:
			return;
		}
		if(isNaN(monthlyIncome))
			return;
		monthlyDebt = _cleanNumber(form.debt);
		if(isNaN(monthlyDebt))
			return;
		debt2Income = _cleanNumber(form.d2i);
		if(isNaN(debt2Income))
			return;
		rate = _cleanNumber(form.estapr) / 12 / 100;
		if(isNaN(rate))
			return;
		nper = form.loanTerm * 12;
		pmtStart = _cleanNumber(form.pmtStart);
		pmtEnd = _cleanNumber(form.pmtStop);
		pmtStep = _cleanNumber(form.pmtStep);
		for(var i = pmtStart; i >= pmtEnd; i -= pmtStep) {
			var loan = ((Math.pow((1 + rate), nper) - 1) * i) / (rate * Math.pow((rate + 1), nper)),
				down = (loan * 0.2) / 0.8,
				homeprice = loan + down,
				taxes = calculateTax(homeprice, form.community),
				utils = HomeCostCalculatorData.getEstUtilTotal();
			var obj = {
				payment: _formatAsCurrency(i),
				loanamt: _formatAsCurrency(loan),
				down: _formatAsCurrency(down),
				homeprice: _formatAsCurrency(homeprice),
				tax: _formatAsCurrency(taxes),
				util: _formatAsCurrency(utils),
				totalmonthly: _formatAsCurrency(i + utils + (taxes / 12))
			};
			$("table#table_display").append(Mustache.render(template, obj));
		}
		$('form#table_form').hide();
		$("table#table_display").show();
	}

	function initializeSettings() {
		var utils = HomeCostCalculatorData.getEstUtils();
		var template = $("#util_template").text();
		var html = "";
		var index = 0;
		for(var name in utils) {
			$("#util_inputs").append(Mustache.render(template, {'name': name, 'value': utils[name], 'num': index}));
			$('#util_input_' + index).trigger('create');  // this is for jQuery mobile, so it applys the appropreate styles.
			index++;
		}

		$("#util_inputs").on('click', 'input.utilRemove', function(event) {
			var recnum = event.srcElement.getAttribute('recnum');
			$('#util_input_' + recnum).remove();
		});

		$("#util_inputs").on('blur', 'input[type=text]', function(event) {
			var recnum = event.srcElement.getAttribute('recnum');
			var name = $('input#name_' + recnum).val();
			var cost = _cleanNumber($('input#cost_' + recnum).val() || '');
			cost = isNaN(cost) ? 0 : cost;
			HomeCostCalculatorData.setEstUtils(name, cost);
		})

		$("#add_util").on('click', function(event) {
			$("#util_inputs").append(Mustache.render(template, {'name': '', 'value': '', 'num': index}));
			$('#util_input_' + index).trigger('create');  // this is for jQuery mobile, so it applys the appropreate styles.
			index++;
		});
	}

	function populateCommunities() {
		var communities = HomeCostCalculatorData.getListOfCommunities()
		for(var i = 0; i < communities.length; i++) {
			var community = communities[i];
			$("select#community").append($('<option value="' + community + '">' + community + '</option>'));
		}
	}

	function calculateTax(homePrice, community) {
		var info = HomeCostCalculatorData.getTaxInfoFor(community);
		if(!!info)
			return ((homePrice - (homePrice % _cleanNumber(info.per))) * (_cleanNumber(info.valuation)/100)) * _cleanNumber(info.equalizer) * (_cleanNumber(info.rate)/100);
		else
			return NaN;
	}

	function _cleanNumber (str) {
		return str.replace(/,|\$|%/g, '') * 1;
	}

	function _formatAsCurrency(value) {
		value = value.toFixed(2);
		var arr = value.split('.');
		var whole = arr[0].substr(0,(arr[0].length % 3)), dec = arr[1];
		for(var i = (arr[0].length % 3); i < arr[0].length; i = i + 3) {
			whole += ((i>0)?",":"") + arr[0].substr(i, 3);
		}
		return "$" + whole + "." + dec;
	}

	function PMT (rate, nper, loan) {
		return (loan * (rate * Math.pow((1 + rate), nper))) / (Math.pow((1 + rate), nper) - 1);
	}

	return {
		'initialize': initialize,
		'updateMonthlyPmtsTotals': updateMonthlyPmtsTotals
	}

})((typeof Zepto != 'undefined')? Zepto : jQuery);

window.HomeCostCalculatorData = (function($) {

	var EstUtils = {
		Gas: 0,
		Watter: 0,
		Electricity: 0
	};

	var TaxData = {};

	/**
	 * 
	 */
	function initialize(callback) {
		_loadUtilityDataFromLocalStorage();
		loadTaxData(false, callback);
	}

	function loadTaxData(block, callback) {
		$.ajax({
			url: "data/taxData.csv",
			async: (block === true) ? false : true,
			success: function(data) {
				if(data) {
					//Parse data
					parse(data);
					callback(true);
				} else {
					callback(_loadTaxDataFromLocalStorage());
				}
			}, 
			error: function(xhr, type, error) {
				callback(_loadTaxDataFromLocalStorage());
			}
		});
	}

	function _loadTaxDataFromLocalStorage() {
		if(Modernizr.localstorage && localStorage['HCC_TaxData']) {
			TaxData = JSON.parse(localStorage['HCC_TaxData']);
			return true;
		} else {
			TaxData = {};
			return false;
		}
	}

	function _loadUtilityDataFromLocalStorage() {
		EstUtils = (Modernizr.localstorage && localStorage['HCC_EstUtils']) ? JSON.parse(localStorage['HCC_EstUtils']) : { "Gas": 0, "Watter": 0, "Electricity": 0 };
	}

	function parse(data) {
		var lines = data.split('\n');
		for(var i = 1; i < lines.length; i++) {  // I am assumeing that the first line is a header.
			var line = lines[i].split(',');
			insertTaxData(line);
		}
	}

	function insertTaxData(arr) {
		TaxData[arr[0]] = {
			county: arr[1],
			per: arr[2],
			valuation: arr[3],
			rate: arr[4],
			equalizer: arr[5]
		}
	}

	function getTaxInfoFor(community) {
		return (!!TaxData[community]) ? TaxData[community] : null;
	}

	function getListOfCommunities() {
		var ret = [];
		for(var key in TaxData) {
			ret.push(key);
		}
		return ret;
	}

	function getEstUtils() {
		return EstUtils;
	}

	function setEstUtils(arg1, arg2) {
		if(typeof arg1 == 'object') {
			EstUtils = arg1;
		} else if(typeof arg1 == 'string') {
			EstUtils[arg1] = arg2;
		} else {
			return false;
		}
		return true;
	}

	function getEstUtilTotal() {
		var value = 0;
		for(var key in EstUtils) {
			value += EstUtils[key];
		}
		return value;
	}

	function saveData() {
		if(Modernizr.localstorage) {
			localStorage['HCC_TaxData'] = JSON.stringify(TaxData);
			localStorage['HCC_EstUtils'] = JSON.stringify(EstUtils);
		}
	}

	function _cleanNumber (str) {
		return str.replace(/,|\$|%/g, '') * 1;
	}

	return {
		"initialize": initialize,
		"getTaxInfoFor": getTaxInfoFor,
		"getListOfCommunities": getListOfCommunities,
		"setEstUtils": setEstUtils,
		"getEstUtils": getEstUtils,
		"getEstUtilTotal": getEstUtilTotal,
		"saveData": saveData
	}

})((typeof Zepto != 'undefined')? Zepto : jQuery);
