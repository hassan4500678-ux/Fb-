package com.faizanbrothers.ems;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;

final class NeonChartView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final float[] values = new float[]{72f, 88f, 64f, 93f, 79f, 101f};

    NeonChartView(Context context) {
        super(context);
        setMinimumHeight(dp(150));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int width = getWidth();
        int height = getHeight();
        paint.setColor(Color.rgb(8, 20, 46));
        canvas.drawRoundRect(0, 0, width, height, dp(18), dp(18), paint);

        float barWidth = width / (values.length * 2f);
        for (int i = 0; i < values.length; i += 1) {
            float normalized = Math.min(1f, values[i] / 110f);
            float left = (i * 2f + 0.6f) * barWidth;
            float right = left + barWidth;
            float top = height - dp(18) - normalized * (height - dp(42));
            paint.setColor(i % 2 == 0 ? Color.rgb(0, 194, 255) : Color.rgb(123, 97, 255));
            canvas.drawRoundRect(left, top, right, height - dp(18), dp(8), dp(8), paint);
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
