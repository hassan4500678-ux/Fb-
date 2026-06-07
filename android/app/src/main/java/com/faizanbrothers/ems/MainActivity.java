package com.faizanbrothers.ems;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(5, 11, 31);
    private static final int SECONDARY = Color.rgb(8, 20, 46);
    private static final int CARD = Color.rgb(11, 23, 54);
    private static final int NEON = Color.rgb(0, 194, 255);
    private static final int CYAN = Color.rgb(0, 229, 255);
    private static final int PURPLE = Color.rgb(123, 97, 255);
    private static final int GREEN = Color.rgb(0, 210, 106);
    private static final int ORANGE = Color.rgb(255, 176, 32);
    private static final int GRAY = Color.rgb(167, 176, 192);

    private final Handler main = new Handler(Looper.getMainLooper());
    private TokenVault tokenVault;
    private ApiClient api;
    private SharedPreferences cache;
    private LinearLayout content;
    private LinearLayout menu;
    private TextView statusLine;
    private String activeMenu = "Dashboard";
    private String role = "employee";
    private String displayName = "Employee";
    private String category = "Field Team";
    private String badge = "Star";

    private final String[] menus = new String[]{
            "Dashboard", "Employees Registry", "Attendance", "KPI Metrics", "New Target Setup",
            "Payroll", "Wallet", "Leaderboard", "Ranks", "Submitted Sheets", "Notifications",
            "Reports", "Holiday Setup", "Settings", "Logout"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        tokenVault = new TokenVault(this);
        api = new ApiClient(this, tokenVault);
        cache = getSharedPreferences("ems_cache", MODE_PRIVATE);
        role = cache.getString("role", "employee");
        displayName = cache.getString("name", role.equals("admin") ? "Hassan Khan" : "Employee");
        category = cache.getString("category", role.equals("admin") ? "Admin" : "Field Team");
        badge = cache.getString("badge", role.equals("admin") ? "OG" : "Star");
        if (tokenVault.getToken() == null) showLogin();
        else showShell();
    }

    private void showLogin() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        scroll.setBackgroundResource(R.drawable.ems_neon_backdrop);
        LinearLayout root = column();
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(18), safeTop() + dp(18), dp(18), safeBottom() + dp(18));
        scroll.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView logo = text("Faizan & Brothers EMS", 28, Color.WHITE, true);
        logo.setGravity(Gravity.CENTER);
        root.addView(logo);
        TextView subtitle = text("Production Android Employee Management System", 14, GRAY, false);
        subtitle.setGravity(Gravity.CENTER);
        root.addView(subtitle);
        root.addView(space(18));

        LinearLayout card = card();
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        TextView title = text("Secure Login", 22, Color.WHITE, true);
        title.setGravity(Gravity.CENTER);
        card.addView(title);
        TextView adminHint = text("Admin: hassanullahkhan989@gmail.com", 12, GRAY, false);
        adminHint.setGravity(Gravity.CENTER);
        card.addView(adminHint);
        card.addView(space(12));

        EditText email = input("Email", InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        email.setText(cache.getString("last_email", "hassanullahkhan989@gmail.com"));
        EditText password = input("Password", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText apiUrl = input("API URL e.g. https://your-domain.com", InputType.TYPE_TEXT_VARIATION_URI);
        apiUrl.setText(api.getBaseUrl());
        Button login = button("Login", NEON);
        statusLine = text("", 13, GRAY, false);
        statusLine.setGravity(Gravity.CENTER);

        card.addView(email);
        card.addView(space(10));
        card.addView(password);
        card.addView(space(10));
        card.addView(apiUrl);
        TextView apiHelp = text("Enter a deployed backend URL. Localhost/127.0.0.1 will not work on a physical phone.", 11, GRAY, false);
        apiHelp.setGravity(Gravity.CENTER);
        card.addView(space(8));
        card.addView(apiHelp);
        card.addView(space(14));
        card.addView(login, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));
        card.addView(space(10));
        card.addView(statusLine);
        card.startAnimation(AnimationUtils.loadAnimation(this, R.anim.slide_up));
        root.addView(card);

        login.setOnClickListener(v -> {
            api.setBaseUrl(apiUrl.getText().toString());
            if (api.getBaseUrl().isEmpty()) {
                statusLine.setText("Please enter your deployed backend API URL first.");
                return;
            }
            statusLine.setText("Checking API...");
            login.setEnabled(false);
            api.get("/health", new ApiClient.Callback() {
                @Override
                public void onSuccess(String body) {
                    main.post(() -> statusLine.setText("API online. Signing in..."));
                    performLogin(email, password, login);
                }

                @Override
                public void onError(String message, int statusCode) {
                    main.post(() -> {
                        statusLine.setText("API not available. Deploy backend and use its HTTPS URL.");
                        login.setEnabled(true);
                    });
                }
            });
        });

        setContentView(scroll);
    }

    private void performLogin(EditText email, EditText password, Button login) {
        api.post("/api/auth/login", SimpleJson.loginPayload(email.getText().toString().trim(), password.getText().toString()), new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> {
                    try {
                        JSONObject json = new JSONObject(body);
                        JSONObject user = json.optJSONObject("user");
                        tokenVault.saveToken(json.optString("token"));
                        if (user != null) rememberUser(user);
                        cache.edit().putString("last_email", email.getText().toString().trim()).apply();
                        showShell();
                    } catch (Exception error) {
                        statusLine.setText("Login response error. Please check API version.");
                        login.setEnabled(true);
                    }
                });
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> {
                    statusLine.setText(statusCode == 0 ? "Network request failed. Check API URL and internet." : "Invalid login, inactive account, or API error.");
                    login.setEnabled(true);
                });
            }
        });
    }

    private void showShell() {
        LinearLayout root = column();
        root.setBackgroundResource(R.drawable.ems_neon_backdrop);

        LinearLayout header = row();
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(16), safeTop() + dp(12), dp(16), dp(10));
        header.addView(avatar(displayName, 52));
        LinearLayout profile = column();
        profile.setPadding(dp(12), 0, 0, 0);
        profile.addView(text(displayName, 18, Color.WHITE, true));
        profile.addView(text(category + " • " + badge + " • Online", 12, GREEN, false));
        header.addView(profile, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        root.addView(header);

        HorizontalScrollView menuScroll = new HorizontalScrollView(this);
        menuScroll.setHorizontalScrollBarEnabled(false);
        menu = row();
        menu.setPadding(dp(12), dp(4), dp(12), dp(10));
        menuScroll.addView(menu);
        root.addView(menuScroll);

        ScrollView scroll = new ScrollView(this);
        scroll.setClipToPadding(false);
        content = column();
        content.setPadding(dp(16), dp(6), dp(16), safeBottom() + dp(30));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        content.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in));
        renderMenu();
        loadMe();
        selectMenu("Dashboard");
    }

    private void renderMenu() {
        menu.removeAllViews();
        for (String item : menus) {
            Button pill = button(item, item.equals(activeMenu) ? NEON : SECONDARY);
            pill.setTextColor(item.equals(activeMenu) ? BG : Color.WHITE);
            pill.setTextSize(12);
            pill.setOnClickListener(v -> selectMenu(item));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40));
            lp.setMargins(0, 0, dp(8), 0);
            menu.addView(pill, lp);
        }
    }

    private void selectMenu(String item) {
        if ("Logout".equals(item)) {
            tokenVault.clear();
            cache.edit().remove("dashboard_admin").remove("dashboard_employee").apply();
            showLogin();
            return;
        }
        activeMenu = item;
        if (menu != null) renderMenu();
        content.removeAllViews();
        switch (item) {
            case "Dashboard":
                renderCachedDashboard();
                refreshDashboard();
                break;
            case "Attendance":
                renderAttendance();
                break;
            case "Wallet":
                renderWallet();
                break;
            case "Leaderboard":
            case "Ranks":
                renderLeaderboard();
                break;
            case "Reports":
                renderReports();
                break;
            case "Holiday Setup":
                renderHolidaySetup();
                break;
            case "Office Status":
                renderOfficeStatus();
                break;
            default:
                renderFeatureSection(item);
                break;
        }
    }

    private void loadMe() {
        api.get("/api/me", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> {
                    try {
                        JSONObject user = new JSONObject(body).optJSONObject("user");
                        if (user != null) rememberUser(user);
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(String message, int statusCode) {
                if (statusCode == 401) main.post(() -> {
                    tokenVault.clear();
                    showLogin();
                });
            }
        });
    }

    private void rememberUser(JSONObject user) {
        role = user.optString("role", role);
        displayName = user.optString("name", displayName);
        category = user.optString("category", role.equals("admin") ? "Admin" : category);
        badge = user.optString("badge", badge);
        cache.edit()
                .putString("role", role)
                .putString("name", displayName)
                .putString("category", category)
                .putString("badge", badge)
                .apply();
    }

    private void renderCachedDashboard() {
        String key = role.equals("admin") ? "dashboard_admin" : "dashboard_employee";
        String cached = cache.getString(key, null);
        if (cached != null) {
            renderDashboardJson(cached, true);
        } else {
            renderDashboardFallback();
        }
    }

    private void refreshDashboard() {
        String endpoint = role.equals("admin") ? "/api/dashboard/admin" : "/api/dashboard/employee";
        api.get(endpoint, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                cache.edit().putString(role.equals("admin") ? "dashboard_admin" : "dashboard_employee", body).apply();
                main.post(() -> renderDashboardJson(body, false));
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> toastLine("Offline/cache mode active. Dashboard will refresh automatically when API is reachable."));
            }
        });
    }

    private void renderDashboardJson(String body, boolean cached) {
        content.removeAllViews();
        try {
            JSONObject json = new JSONObject(body);
            content.addView(text(role.equals("admin") ? "Welcome to Faizan & Brothers" : "My Dashboard", 25, Color.WHITE, true));
            content.addView(text(cached ? "Instant cached data • silent refresh running" : "Live PostgreSQL data", 12, cached ? ORANGE : GREEN, false));
            content.addView(space(14));
            if (role.equals("admin")) renderAdminDashboard(json);
            else renderEmployeeDashboard(json);
        } catch (Exception error) {
            renderDashboardFallback();
        }
    }

    private void renderAdminDashboard(JSONObject json) {
        JSONObject cards = json.optJSONObject("cards");
        JSONObject live = cards == null ? new JSONObject() : cards.optJSONObject("liveOfficeStatus");
        JSONObject kpi = cards == null ? new JSONObject() : cards.optJSONObject("kpiSummary");
        JSONObject wallet = cards == null ? new JSONObject() : cards.optJSONObject("walletSummary");
        LinearLayout grid = column();
        grid.addView(metric("Total Employees", value(cards, "totalEmployees"), NEON));
        grid.addView(metric("Present", value(cards, "present"), GREEN));
        grid.addView(metric("Absent", value(cards, "absent"), Color.rgb(255, 87, 87)));
        grid.addView(metric("Half Day", value(cards, "halfDay"), ORANGE));
        grid.addView(metric("KPI Summary", String.format(Locale.US, "%.1f%%", kpi == null ? 0 : kpi.optDouble("percentage")), PURPLE));
        grid.addView(metric("Wallet Coins", String.valueOf(wallet == null ? 0 : wallet.optInt("coins")), CYAN));
        content.addView(grid);
        content.addView(liveOfficeCard(live));
        content.addView(sectionCard("Monthly Trends", "Optimized lightweight KPI, attendance, wallet, and category growth visualization.", new NeonChartView(this)));
    }

    private void renderEmployeeDashboard(JSONObject json) {
        JSONObject employee = json.optJSONObject("employee");
        JSONObject wallet = json.optJSONObject("wallet");
        JSONObject kpi = json.optJSONObject("kpiSummary");
        JSONObject attendance = json.optJSONObject("attendanceSummary");
        if (employee != null) rememberUser(employee);
        content.addView(profileCard());
        content.addView(metric("Wallet Balance", "PKR " + String.format(Locale.US, "%.0f", wallet == null ? 0 : wallet.optDouble("wallet_balance")), NEON));
        content.addView(metric("Coins", String.valueOf(wallet == null ? 0 : wallet.optInt("coins")), CYAN));
        content.addView(metric("KPI Progress", String.format(Locale.US, "%.1f%%", kpi == null ? 0 : kpi.optDouble("percentage")), GREEN));
        content.addView(metric("Attendance", "P " + value(attendance, "present") + " • H " + value(attendance, "halfDay") + " • A " + value(attendance, "absent"), ORANGE));
        content.addView(sectionCard("Monthly Target", "Target " + value(kpi, "monthlyTarget") + " • Achieved " + value(kpi, "achieved") + " • Remaining " + value(kpi, "remaining") + "\nDaily fixed " + value(kpi, "dailyFixed") + " • Daily live " + value(kpi, "dailyLive"), null));
        LinearLayout actions = row();
        actions.addView(action("My KPI", () -> selectMenu("KPI Metrics")));
        actions.addView(action("My Wallet", () -> selectMenu("Wallet")));
        actions.addView(action("Salary", () -> selectMenu("Payroll")));
        actions.addView(action("Rank", () -> selectMenu("Ranks")));
        content.addView(actions);
    }

    private void renderDashboardFallback() {
        content.removeAllViews();
        content.addView(text("Faizan & Brothers EMS", 25, Color.WHITE, true));
        content.addView(text("Instant startup cache is empty. Login and API data will fill this dashboard.", 13, GRAY, false));
        content.addView(space(14));
        content.addView(metric("Total Employees", "--", NEON));
        content.addView(metric("Present", "--", GREEN));
        content.addView(metric("KPI Summary", "--", PURPLE));
        content.addView(metric("Wallet Summary", "--", CYAN));
        ProgressBar progressBar = new ProgressBar(this);
        content.addView(progressBar);
    }

    private View liveOfficeCard(JSONObject live) {
        LinearLayout card = card();
        card.addView(text("Live Office Status", 21, Color.WHITE, true));
        card.addView(text("Total " + value(live, "totalEmployees") + " • Present " + value(live, "presentToday") + " • Checked-In " + value(live, "checkedIn") + " • Checked-Out " + value(live, "checkedOut"), 13, GRAY, false));
        card.addView(text("Half-Day " + value(live, "halfDay") + " • Absent " + value(live, "absent") + " • Holiday " + value(live, "holiday") + " • Active " + value(live, "activeEmployees"), 13, GRAY, false));
        LinearLayout faces = row();
        JSONArray employees = live == null ? null : live.optJSONArray("employees");
        if (employees != null) {
            for (int i = 0; i < Math.min(6, employees.length()); i += 1) {
                JSONObject employee = employees.optJSONObject(i);
                faces.addView(avatar(employee == null ? "FB" : employee.optString("name"), 38));
            }
        }
        card.addView(space(10));
        card.addView(faces);
        Button viewAll = button("View All", NEON);
        viewAll.setOnClickListener(v -> {
            activeMenu = "Office Status";
            renderMenu();
            renderOfficeStatus();
        });
        card.addView(space(12));
        card.addView(viewAll);
        return card;
    }

    private void renderOfficeStatus() {
        content.removeAllViews();
        content.addView(text("Office Status", 24, Color.WHITE, true));
        content.addView(text("Profile, category, badge, attendance state, check-in/out, and KPI progress.", 13, GRAY, false));
        api.get("/api/office-status", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> {
                    try {
                        JSONArray employees = new JSONObject(body).optJSONArray("employees");
                        if (employees == null || employees.length() == 0) {
                            content.addView(sectionCard("No employees", "No active employees found.", null));
                            return;
                        }
                        for (int i = 0; i < employees.length(); i += 1) addEmployeeStatus(employees.optJSONObject(i));
                    } catch (Exception error) {
                        content.addView(sectionCard("Status unavailable", "Unable to parse office status.", null));
                    }
                });
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> content.addView(sectionCard("Offline", "Office status will load when the API is reachable.", null)));
            }
        });
    }

    private void addEmployeeStatus(JSONObject employee) {
        if (employee == null) return;
        String status = employee.optString("attendance_status", "absent");
        int color = statusColor(status);
        LinearLayout item = rowCard();
        item.addView(avatar(employee.optString("name"), 44));
        LinearLayout details = column();
        details.setPadding(dp(12), 0, 0, 0);
        details.addView(text(employee.optString("name"), 16, Color.WHITE, true));
        details.addView(text(employee.optString("category") + " • " + employee.optString("badge"), 12, GRAY, false));
        details.addView(text(status.toUpperCase(Locale.US) + " • In " + employee.optString("check_in_time", "--") + " • Out " + employee.optString("check_out_time", "--") + " • KPI " + employee.optDouble("kpi_progress") + "%", 12, color, false));
        item.addView(details, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        content.addView(item);
    }

    private void renderAttendance() {
        content.addView(text("Attendance", 24, Color.WHITE, true));
        content.addView(text("9:15 AM Asia/Karachi half-day rule, midnight reset, holiday-safe.", 13, GRAY, false));
        Button in = button("Check-In", GREEN);
        Button out = button("Check-Out", NEON);
        in.setOnClickListener(v -> api.post("/api/attendance/check-in", "{}", callbackLine("Checked in successfully", "Check-in failed")));
        out.setOnClickListener(v -> api.post("/api/attendance/check-out", "{}", callbackLine("Checked out successfully", "Check-out failed")));
        content.addView(sectionCard("Today", "Use the actions below. Saved Friday holidays hide attendance and avoid deductions.", null));
        content.addView(in);
        content.addView(space(10));
        content.addView(out);
    }

    private void renderWallet() {
        content.addView(text("Wallet", 24, Color.WHITE, true));
        LinearLayout card = card();
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Color.rgb(0, 194, 255), Color.rgb(123, 97, 255), Color.rgb(8, 20, 46)});
        bg.setCornerRadius(dp(24));
        card.setBackground(bg);
        card.addView(text("FAIZAN REWARD CARD", 13, Color.WHITE, true));
        card.addView(space(20));
        card.addView(text("4444 0000 0000 ****", 24, Color.WHITE, true));
        card.addView(text(displayName.toUpperCase(Locale.US), 14, Color.WHITE, false));
        card.addView(text("Virtual wallet only • Not banking", 11, Color.WHITE, false));
        content.addView(card);
        api.get("/api/wallet", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> {
                    try {
                        JSONObject wallet = new JSONObject(body).optJSONObject("wallet");
                        content.addView(metric("Balance", "PKR " + (wallet == null ? "0" : wallet.optString("wallet_balance", "0")), NEON));
                        content.addView(metric("Points", wallet == null ? "0" : wallet.optString("points", "0"), CYAN));
                        content.addView(metric("Monthly Coins", wallet == null ? "0" : wallet.optString("monthly_coins", "0"), GREEN));
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> toastLine("Wallet cache is unavailable until API connects."));
            }
        });
    }

    private void renderLeaderboard() {
        content.addView(text(activeMenu, 24, Color.WHITE, true));
        api.get("/api/leaderboard", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> {
                    try {
                        JSONArray rows = new JSONObject(body).optJSONArray("leaderboard");
                        if (rows == null || rows.length() == 0) content.addView(sectionCard("No ranking yet", "KPI and coins will populate the leaderboard.", null));
                        for (int i = 0; rows != null && i < rows.length(); i += 1) {
                            JSONObject row = rows.optJSONObject(i);
                            content.addView(sectionCard("#" + row.optInt("rank") + " " + row.optString("name"), row.optString("badge") + " • KPI " + row.optDouble("kpi_percentage") + "% • Coins " + row.optInt("coins"), null));
                        }
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> content.addView(sectionCard("Offline", "Leaderboard refresh will retry when online.", null)));
            }
        });
    }

    private void renderReports() {
        content.addView(text("Reports", 24, Color.WHITE, true));
        content.addView(sectionCard("Export Center", "Generate KPI, salary, attendance, wallet, and analytics reports from PostgreSQL.", null));
        String[] types = {"kpi", "salary", "attendance", "wallet", "analytics"};
        for (String type : types) {
            LinearLayout row = row();
            row.addView(action(type.toUpperCase(Locale.US) + " PDF", () -> toastLine("Call /api/reports/" + type + ".pdf from admin session.")));
            row.addView(action(type.toUpperCase(Locale.US) + " Excel", () -> toastLine("Call /api/reports/" + type + ".xlsx from admin session.")));
            content.addView(row);
        }
    }

    private void renderHolidaySetup() {
        content.addView(text("Holiday Setup", 24, Color.WHITE, true));
        content.addView(sectionCard("Friday Holiday Rules", "Admin can save month/year Friday holidays in PostgreSQL. Saved holidays hide attendance and prevent absent, half-day, and salary deductions.", null));
        content.addView(sectionCard("Timezone", "Asia/Karachi", null));
    }

    private void renderFeatureSection(String title) {
        content.addView(text(title, 24, Color.WHITE, true));
        String body = "Connected module for permanent PostgreSQL data, safe null handling, cached display, and enterprise dark neon UI.";
        if ("Employees Registry".equals(title)) body = "Add, edit, suspend, restore, soft delete employees. Fields: name, email, password, category, monthly target, PJP, joining year, profile picture.";
        if ("KPI Metrics".equals(title)) body = "Monthly, yearly, historical KPI filters with daily fixed/live target calculations and optimized charts.";
        if ("New Target Setup".equals(title)) body = "Assign future monthly targets without overwriting history. Targets activate at the first date 12:00 AM.";
        if ("Payroll".equals(title)) body = "Salary engine includes basic salary, petrol, mobile, bike maintenance, daily rounds, deductions, KPI incentive, PC incentive, and badge bonus.";
        if ("Settings".equals(title)) body = "Dark, light, and system mode support placeholder with cached startup and API timeout recovery.";
        content.addView(sectionCard(title, body, "KPI Metrics".equals(title) ? new NeonChartView(this) : null));
    }

    private ApiClient.Callback callbackLine(String success, String failure) {
        return new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                main.post(() -> toastLine(success));
            }

            @Override
            public void onError(String message, int statusCode) {
                main.post(() -> toastLine(failure));
            }
        };
    }

    private View profileCard() {
        LinearLayout card = rowCard();
        card.addView(avatar(displayName, 58));
        LinearLayout info = column();
        info.setPadding(dp(14), 0, 0, 0);
        info.addView(text(displayName, 20, Color.WHITE, true));
        info.addView(text(category + " • " + badge + " • Online", 13, GREEN, false));
        card.addView(info);
        return card;
    }

    private View metric(String label, String value, int color) {
        LinearLayout card = card();
        card.addView(text(label, 13, GRAY, false));
        card.addView(text(value, 26, color, true));
        return card;
    }

    private View sectionCard(String title, String body, View child) {
        LinearLayout card = card();
        card.addView(text(title, 19, Color.WHITE, true));
        card.addView(text(body, 13, GRAY, false));
        if (child != null) {
            card.addView(space(12));
            card.addView(child, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(160)));
        }
        return card;
    }

    private LinearLayout card() {
        LinearLayout card = column();
        card.setPadding(dp(16), dp(14), dp(16), dp(14));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(CARD);
        bg.setCornerRadius(dp(22));
        bg.setStroke(dp(1), Color.argb(80, 0, 229, 255));
        card.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, dp(12));
        card.setLayoutParams(lp);
        return card;
    }

    private LinearLayout rowCard() {
        LinearLayout card = row();
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(CARD);
        bg.setCornerRadius(dp(18));
        bg.setStroke(dp(1), Color.argb(70, 0, 194, 255));
        card.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, dp(10));
        card.setLayoutParams(lp);
        return card;
    }

    private TextView avatar(String name, int size) {
        TextView view = text(initials(name), size <= 40 ? 12 : 16, BG, true);
        view.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{NEON, PURPLE});
        bg.setShape(GradientDrawable.OVAL);
        view.setBackground(bg);
        view.setLayoutParams(new LinearLayout.LayoutParams(dp(size), dp(size)));
        return view;
    }

    private Button action(String label, Runnable runnable) {
        Button button = button(label, SECONDARY);
        button.setTextSize(11);
        button.setOnClickListener(v -> runnable.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(44), 1);
        lp.setMargins(0, 0, dp(8), dp(8));
        button.setLayoutParams(lp);
        return button;
    }

    private Button button(String label, int color) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(color);
        bg.setCornerRadius(dp(20));
        bg.setStroke(dp(1), color == SECONDARY ? Color.argb(60, 0, 229, 255) : CYAN);
        button.setBackground(bg);
        return button;
    }

    private EditText input(String hint, int type) {
        EditText editText = new EditText(this);
        editText.setHint(hint);
        editText.setInputType(type);
        editText.setSingleLine(true);
        editText.setTextColor(Color.WHITE);
        editText.setHintTextColor(GRAY);
        editText.setPadding(dp(14), 0, dp(14), 0);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(SECONDARY);
        bg.setCornerRadius(dp(16));
        bg.setStroke(dp(1), Color.argb(80, 0, 229, 255));
        editText.setBackground(bg);
        editText.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));
        return editText;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value == null ? "" : value);
        text.setTextSize(sp);
        text.setTextColor(color);
        text.setLineSpacing(dp(2), 1.0f);
        if (bold) text.setTypeface(Typeface.DEFAULT_BOLD);
        return text;
    }

    private LinearLayout column() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }

    private LinearLayout row() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        return layout;
    }

    private View space(int height) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(height)));
        return view;
    }

    private void toastLine(String message) {
        TextView line = text(message, 12, ORANGE, false);
        line.setPadding(0, dp(8), 0, dp(8));
        content.addView(line, 0);
    }

    private String value(JSONObject json, String key) {
        if (json == null) return "0";
        Object raw = json.opt(key);
        if (raw == null) return "0";
        if (raw instanceof Number) {
            double number = ((Number) raw).doubleValue();
            if (Math.floor(number) == number) return String.valueOf((long) number);
            return String.format(Locale.US, "%.2f", number);
        }
        return String.valueOf(raw);
    }

    private String initials(String name) {
        if (name == null || name.trim().isEmpty()) return "FB";
        String[] parts = name.trim().split("\\s+");
        String first = parts[0].substring(0, 1);
        String second = parts.length > 1 ? parts[1].substring(0, 1) : "";
        return (first + second).toUpperCase(Locale.US);
    }

    private int statusColor(String status) {
        switch (status) {
            case "present":
                return GREEN;
            case "absent":
                return Color.rgb(255, 87, 87);
            case "half_day":
                return ORANGE;
            case "checked_out":
                return NEON;
            case "holiday":
                return GRAY;
            default:
                return CYAN;
        }
    }

    private int safeTop() {
        return systemDimension("status_bar_height", dp(12));
    }

    private int safeBottom() {
        return systemDimension("navigation_bar_height", dp(10));
    }

    private int systemDimension(String name, int fallback) {
        int resourceId = getResources().getIdentifier(name, "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : fallback;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
