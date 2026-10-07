<?php
/**
 * Google Sheets Synchronizer Engine
 * Pulls & parses remote Google Sheets (Public CSV, Apps Script Proxy, or Manual Payload)
 */

require_once __DIR__ . '/db.php';

class SheetFetcher {

    /**
     * Extract Document ID and GID from a Google Sheets URL
     */
    public static function parseUrl($url) {
        $doc_id = '';
        $gid = '0';

        if (preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $url, $matches)) {
            $doc_id = $matches[1];
        }

        if (preg_match('/[#&?]gid=([0-9]+)/', $url, $matches)) {
            $gid = $matches[1];
        }

        return ['doc_id' => $doc_id, 'gid' => $gid];
    }

    /**
     * Sync a single spreadsheet by ID
     */
    public static function syncSpreadsheet($sheet_id) {
        $dbData = get_db_data();
        $spreadsheets = &$dbData['spreadsheets'];

        $targetIdx = -1;
        foreach ($spreadsheets as $idx => $s) {
            if ($s['id'] == $sheet_id) {
                $targetIdx = $idx;
                break;
            }
        }

        if ($targetIdx === -1) {
            return ['status' => 'error', 'message' => 'Spreadsheet config not found'];
        }

        $sheet = &$spreadsheets[$targetIdx];
        $method = $sheet['fetch_method'] ?? 'csv_direct';
        $doc_id = $sheet['doc_id'];
        $gid = $sheet['gid'] ?? '0';

        $csvText = '';
        $fetchError = '';

        if ($method === 'csv_direct') {
            $csvUrl = "https://docs.google.com/spreadsheets/d/{$doc_id}/export?format=csv&gid={$gid}";
            $csvText = self::httpGet($csvUrl);

            if (empty($csvText) || strpos($csvText, '<!DOCTYPE html>') !== false) {
                $sheet['sync_status'] = 'auth_required';
                $fetchError = 'Private Google Sheet. Please set fetch_method to Google Apps Script or share public link.';
            }
        } elseif ($method === 'apps_script' && !empty($sheet['apps_script_url'])) {
            $csvText = self::httpGet($sheet['apps_script_url']);
            if (empty($csvText)) {
                $sheet['sync_status'] = 'apps_script_failed';
                $fetchError = 'Failed to fetch data from Apps Script Web App URL.';
            }
        }

        if (empty($csvText) || strpos($csvText, '<!DOCTYPE html>') !== false) {
            save_db_data($dbData);
            return [
                'status' => 'error',
                'message' => $fetchError ?: 'Could not retrieve CSV content from Google Sheets.',
                'sheet' => $sheet
            ];
        }

        // Parse CSV content
        $lines = preg_split('/\r\n|\r|\n/', $csvText);
        $parsedCount = 0;

        if ($sheet['category'] === 'mis_ops') {
            $newTransactions = [];
            for ($i = 1; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;
                $cols = str_getcsv($line);
                if (count($cols) >= 6) {
                    $date = isset($cols[0]) ? trim(str_replace('"', '', $cols[0])) : '';
                    $dealerId = isset($cols[1]) ? trim(str_replace('"', '', $cols[1])) : '';
                    $timestamp = isset($cols[2]) ? trim(str_replace('"', '', $cols[2])) : '';
                    $email = isset($cols[3]) ? trim(str_replace('"', '', $cols[3])) : '';
                    $emp = isset($cols[4]) ? trim(str_replace('"', '', $cols[4])) : 'Unassigned';
                    $dealer = isset($cols[5]) ? trim(str_replace('"', '', $cols[5])) : 'Unassigned';
                    $amtStr = isset($cols[6]) ? preg_replace('/[^\d.]/', '', $cols[6]) : '0';
                    $amt = floatval($amtStr);
                    $method = isset($cols[7]) ? trim(str_replace('"', '', $cols[7])) : 'Other';
                    $slip = isset($cols[8]) ? trim(str_replace('"', '', $cols[8])) : '';
                    $account = isset($cols[9]) ? trim(str_replace('"', '', $cols[9])) : '';
                    $note = isset($cols[10]) ? trim(str_replace('"', '', $cols[10])) : '';

                    if ($amt > 0 || $emp !== 'Unassigned') {
                        $newTransactions[] = [
                            'id' => count($newTransactions) + 1,
                            'sheet_id' => $sheet_id,
                            'trans_date' => $date ?: ($timestamp ? explode(' ', $timestamp)[0] : date('Y-m-d')),
                            'dealer_id' => $dealerId,
                            'timestamp' => $timestamp,
                            'email' => $email,
                            'employee_name' => $emp,
                            'depositor_store' => $dealer,
                            'deposit_amount' => $amt,
                            'payment_method' => $method,
                            'payment_slip_url' => $slip,
                            'account' => $account,
                            'note' => $note
                        ];
                    }
                }
            }
            if (!empty($newTransactions)) {
                $dbData['transactions'] = $newTransactions;
                $parsedCount = count($newTransactions);
            }
        } else {
            // Workstation orders
            $newOrders = [];
            for ($i = 3; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;
                $cols = str_getcsv($line);
                if (count($cols) >= 3) {
                    $status = isset($cols[0]) ? trim($cols[0]) : 'Pending';
                    $wing = isset($cols[1]) ? trim($cols[1]) : 'General';
                    $party = isset($cols[2]) ? trim($cols[2]) : '';
                    $notes = isset($cols[17]) ? trim($cols[17]) : '';
                    $salesGuy = isset($cols[18]) ? trim($cols[18]) : 'Staff';

                    if (!empty($party)) {
                        $models = [
                            ['col' => 3, 'name' => '200 | 256'],
                            ['col' => 5, 'name' => 'X7d'],
                            ['col' => 7, 'name' => '400 | Lite'],
                            ['col' => 9, 'name' => '400 | 256'],
                            ['col' => 11, 'name' => '400 | 512'],
                            ['col' => 13, 'name' => '400 | Pro'],
                            ['col' => 15, 'name' => 'TV Box / Stick']
                        ];
                        $hasItem = false;
                        foreach ($models as $m) {
                            if (isset($cols[$m['col']]) && !empty(trim($cols[$m['col']]))) {
                                $hasItem = true;
                                $newOrders[] = [
                                    'id' => count($newOrders) + 1,
                                    'sheet_id' => $sheet_id,
                                    'status' => $status,
                                    'wing' => $wing,
                                    'party_name' => $party,
                                    'sales_guy' => $salesGuy,
                                    'model_name' => $m['name'],
                                    'imei_serial' => trim($cols[$m['col']]),
                                    'quantity' => 1,
                                    'unit_price' => strpos($m['name'], 'Pro') !== false ? 65000 : 38000,
                                    'notes' => $notes
                                ];
                            }
                        }
                        if (!$hasItem) {
                            $newOrders[] = [
                                'id' => count($newOrders) + 1,
                                'sheet_id' => $sheet_id,
                                'status' => $status,
                                'wing' => $wing,
                                'party_name' => $party,
                                'sales_guy' => $salesGuy,
                                'model_name' => 'General Order',
                                'imei_serial' => '',
                                'quantity' => 1,
                                'unit_price' => 35000,
                                'notes' => $notes
                            ];
                        }
                    }
                }
            }
            if (!empty($newOrders)) {
                $dbData['orders'] = $newOrders;
                $parsedCount = count($newOrders);
            }
        }

        $sheet['last_synced_at'] = date('Y-m-d H:i:s');
        $sheet['sync_status'] = 'success';
        $sheet['rows_count'] = $parsedCount;

        save_db_data($dbData);

        return [
            'status' => 'success',
            'message' => "Successfully synced {$parsedCount} rows from {$sheet['title']}",
            'rows_count' => $parsedCount
        ];
    }

    private static function httpGet($url) {
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $output = curl_exec($ch);
            curl_close($ch);
            if ($output !== false) return $output;
        }
        return @file_get_contents($url);
    }
}
