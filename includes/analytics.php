<?php
/**
 * Executive Business Intelligence & Analytics Engine
 */

require_once __DIR__ . '/db.php';

class Analytics {

    public static function getExecutiveOverview() {
        $data = get_db_data();
        $transactions = $data['transactions'] ?? [];
        $orders = $data['orders'] ?? [];
        $settings = $data['settings'] ?? [];

        $marginPct = floatval($settings['est_profit_margin_pct'] ?? 12.5);

        $totalDeposits = 0;
        $totalTrans = count($transactions);
        $employeesMap = [];
        $storesMap = [];
        $paymentMethodsMap = [];

        foreach ($transactions as $t) {
            $amt = floatval($t['deposit_amount'] ?? 0);
            $totalDeposits += $amt;

            $emp = $t['employee_name'] ?: 'Unassigned';
            $store = $t['depositor_store'] ?: 'Unassigned';
            $method = $t['payment_method'] ?: 'Other';

            $employeesMap[$emp] = ($employeesMap[$emp] ?? 0) + $amt;
            $storesMap[$store] = ($storesMap[$store] ?? 0) + $amt;
            $paymentMethodsMap[$method] = ($paymentMethodsMap[$method] ?? 0) + $amt;
        }

        $totalOrders = count($orders);
        $doneOrders = 0;
        $pendingOrders = 0;
        $orderEstValue = 0;

        foreach ($orders as $o) {
            $st = strtolower($o['status'] ?? '');
            if ($st === 'done' || $st === 'printed' || $st === 'completed') {
                $doneOrders++;
            } else {
                $pendingOrders++;
            }
            $orderEstValue += floatval($o['unit_price'] ?? 35000) * intval($o['quantity'] ?? 1);
        }

        $estProfit = $totalDeposits * ($marginPct / 100.0);
        $completionRate = $totalOrders > 0 ? round(($doneOrders / $totalOrders) * 100, 1) : 100;

        return [
            'total_deposits' => $totalDeposits,
            'total_deposits_formatted' => 'BDT ' . number_format($totalDeposits, 0),
            'total_transactions' => $totalTrans,
            'est_profit_margin_pct' => $marginPct,
            'est_net_profit' => $estProfit,
            'est_net_profit_formatted' => 'BDT ' . number_format($estProfit, 0),
            'total_orders' => $totalOrders,
            'done_orders' => $doneOrders,
            'pending_orders' => $pendingOrders,
            'completion_rate' => $completionRate,
            'unique_employees_count' => count($employeesMap),
            'unique_stores_count' => count($storesMap),
            'order_est_value' => $orderEstValue,
            'order_est_value_formatted' => 'BDT ' . number_format($orderEstValue, 0)
        ];
    }

    public static function getResponsibilityMatrix() {
        $data = get_db_data();
        $transactions = $data['transactions'] ?? [];
        $orders = $data['orders'] ?? [];

        $totalCompanyDeposit = 0;
        $staffStats = [];

        foreach ($transactions as $t) {
            $amt = floatval($t['deposit_amount'] ?? 0);
            $totalCompanyDeposit += $amt;

            $rawEmp = $t['employee_name'] ?: 'Unassigned Staff';
            if (!isset($staffStats[$rawEmp])) {
                $staffStats[$rawEmp] = [
                    'name' => $rawEmp,
                    'total_collected' => 0,
                    'trans_count' => 0,
                    'stores' => [],
                    'email' => $t['email'] ?? '',
                    'last_trans_date' => $t['trans_date'] ?? ''
                ];
            }
            $staffStats[$rawEmp]['total_collected'] += $amt;
            $staffStats[$rawEmp]['trans_count']++;

            $store = $t['depositor_store'] ?: 'General';
            $staffStats[$rawEmp]['stores'][$store] = ($staffStats[$rawEmp]['stores'][$store] ?? 0) + $amt;
        }

        // Format & Sort Staff List
        $resultStaff = [];
        foreach ($staffStats as $empName => $info) {
            arsort($info['stores']);
            $topStores = array_slice(array_keys($info['stores']), 0, 3);
            $sharePct = $totalCompanyDeposit > 0 ? round(($info['total_collected'] / $totalCompanyDeposit) * 100, 2) : 0;

            $resultStaff[] = [
                'name' => $empName,
                'total_collected' => $info['total_collected'],
                'total_collected_formatted' => 'BDT ' . number_format($info['total_collected'], 0),
                'trans_count' => $info['trans_count'],
                'share_pct' => $sharePct,
                'top_stores' => implode(', ', $topStores),
                'email' => $info['email'],
                'last_date' => $info['last_trans_date']
            ];
        }

        usort($resultStaff, function($a, $b) {
            return $b['total_collected'] <=> $a['total_collected'];
        });

        // Wing Breakdown from Workstation Orders
        $wingStats = [];
        foreach ($orders as $o) {
            $w = !empty($o['wing']) ? strtoupper($o['wing']) : 'GENERAL';
            if (!isset($wingStats[$w])) {
                $wingStats[$w] = [
                    'wing' => $w,
                    'total_orders' => 0,
                    'done_orders' => 0,
                    'pending_orders' => 0,
                    'parties' => []
                ];
            }
            $wingStats[$w]['total_orders']++;
            $st = strtolower($o['status'] ?? '');
            if ($st === 'done' || $st === 'printed') {
                $wingStats[$w]['done_orders']++;
            } else {
                $wingStats[$w]['pending_orders']++;
            }
            $party = $o['party_name'] ?: 'General Party';
            $wingStats[$w]['parties'][$party] = ($wingStats[$w]['parties'][$party] ?? 0) + 1;
        }

        return [
            'staff_matrix' => $resultStaff,
            'wing_matrix' => array_values($wingStats)
        ];
    }

    public static function getFinancialAnalysis() {
        $data = get_db_data();
        $transactions = $data['transactions'] ?? [];

        $methods = [];
        $monthlyRunRate = [];

        foreach ($transactions as $t) {
            $amt = floatval($t['deposit_amount'] ?? 0);
            $m = !empty($t['payment_method']) ? $t['payment_method'] : 'Other';

            $methods[$m] = ($methods[$m] ?? 0) + $amt;

            // Monthly key
            $dt = $t['trans_date'] ?? '';
            $monthKey = '2025-06';
            if (preg_match('/(\d{4})-(\d{2})/', $dt, $match)) {
                $monthKey = $match[1] . '-' . $match[2];
            } elseif (preg_match('/(\d{1,2})-([A-Za-z]{3})-(\d{2})/', $dt, $match)) {
                $monthKey = '20' . $match[3] . '-06';
            }

            $monthlyRunRate[$monthKey] = ($monthlyRunRate[$monthKey] ?? 0) + $amt;
        }

        arsort($methods);
        $topMethods = [];
        foreach ($methods as $k => $val) {
            $topMethods[] = [
                'method' => $k,
                'amount' => $val,
                'amount_formatted' => 'BDT ' . number_format($val, 0)
            ];
        }

        ksort($monthlyRunRate);
        $trend = [];
        foreach ($monthlyRunRate as $m => $val) {
            $trend[] = [
                'month' => $m,
                'amount' => $val,
                'amount_formatted' => 'BDT ' . number_format($val, 0)
            ];
        }

        return [
            'payment_methods' => $topMethods,
            'monthly_trend' => $trend
        ];
    }

    public static function getDecisionAlerts() {
        $data = get_db_data();
        $transactions = $data['transactions'] ?? [];
        $orders = $data['orders'] ?? [];
        $spreadsheets = $data['spreadsheets'] ?? [];

        $alerts = [];

        // 1. Key Person Dependence Alert
        $resp = self::getResponsibilityMatrix();
        $topStaff = $resp['staff_matrix'][0] ?? null;
        if ($topStaff && $topStaff['share_pct'] > 30) {
            $alerts[] = [
                'id' => 'alert_key_person',
                'severity' => 'warning',
                'title' => 'High Key-Person Revenue Dependency',
                'category' => 'Operations & Personnel',
                'description' => "Senior Representative <strong>{$topStaff['name']}</strong> single-handedly manages <strong>{$topStaff['share_pct']}%</strong> of total company deposit volume ({$topStaff['total_collected_formatted']}).",
                'recommendation' => 'Assign a secondary manager to shadow this key dealer route to safeguard against operational bottlenecks.',
                'action_label' => 'View Staff Matrix'
            ];
        }

        // 2. Pending Workstation Orders Alert
        $pendingOrders = array_filter($orders, function($o) {
            $s = strtolower($o['status'] ?? '');
            return $s !== 'done' && $s !== 'printed';
        });
        if (count($pendingOrders) > 0) {
            $alerts[] = [
                'id' => 'alert_pending_orders',
                'severity' => 'danger',
                'title' => count($pendingOrders) . ' Unfulfilled Workstation Orders',
                'category' => 'Fulfillment & Logistics',
                'description' => "There are <strong>" . count($pendingOrders) . " workstation orders</strong> currently in pending status awaiting dispatch or print processing.",
                'recommendation' => 'Review Workstation Yeasin & Nojrul Wing worksheets to confirm inventory allocation & print slips.',
                'action_label' => 'Inspect Orders'
            ];
        }

        // 3. Spreadsheet Sync Health Alert
        $inactiveSheets = array_filter($spreadsheets, function($s) {
            return ($s['sync_status'] ?? '') !== 'success';
        });
        if (count($inactiveSheets) > 0) {
            $alerts[] = [
                'id' => 'alert_sheet_sync',
                'severity' => 'info',
                'title' => count($inactiveSheets) . ' Spreadsheets Require Setup / Auth',
                'category' => 'Data Integration',
                'description' => count($inactiveSheets) . " private Google Sheet(s) (e.g. Workstation2, Nojrul Wing) require Google Apps Script URL or Service Account authorization.",
                'recommendation' => 'Open Spreadsheet Manager tab to configure Google Apps Script Web App links for bahalul1964@gmail.com.',
                'action_label' => 'Manage Spreadsheets'
            ];
        }

        // 4. Zero Deposit / Missing Payment Slips
        $missingSlips = array_filter($transactions, function($t) {
            return empty($t['payment_slip_url']) && floatval($t['deposit_amount']) > 100000;
        });
        if (count($missingSlips) > 0) {
            $alerts[] = [
                'id' => 'alert_missing_slips',
                'severity' => 'warning',
                'title' => count($missingSlips) . ' High-Value Transactions Missing Slip URLs',
                'category' => 'Financial Audit',
                'description' => "Found <strong>" . count($missingSlips) . " transactions over BDT 100,000</strong> without attached digital payment slip verification links.",
                'recommendation' => 'Notify collection officers to upload payment deposit receipts to Google Drive.',
                'action_label' => 'Review Transactions'
            ];
        }

        return $alerts;
    }
}
