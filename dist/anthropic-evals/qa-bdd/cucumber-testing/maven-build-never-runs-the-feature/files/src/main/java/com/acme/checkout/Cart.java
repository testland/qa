package com.acme.checkout;

import java.util.ArrayList;
import java.util.List;

public class Cart {

    private record Line(String sku, int qty, double price) {}

    private final List<Line> lines = new ArrayList<>();
    private double discount;

    public void add(String sku, int qty, double price) {
        lines.add(new Line(sku, qty, price));
    }

    public int itemCount() {
        return lines.stream().mapToInt(Line::qty).sum();
    }

    public double subtotal() {
        return lines.stream().mapToDouble(l -> l.qty() * l.price()).sum();
    }

    public boolean applyPromo(String code) {
        discount = "WELCOME10".equals(code) ? 0.10 : 0.0;
        return discount > 0;
    }

    public double total() {
        return Math.round(subtotal() * (1 - discount) * 100) / 100.0;
    }
}
