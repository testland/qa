package com.northwind.shop

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView

class CartAdapter(
    private val recycler: RecyclerView,
    private val onRowTapped: (CartLine) -> Unit
) : RecyclerView.Adapter<CartAdapter.Row>() {

    private val lines = mutableListOf<CartLine>()

    class Row(view: android.view.View) : RecyclerView.ViewHolder(view)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Row =
        Row(LayoutInflater.from(parent.context).inflate(R.layout.cart_row, parent, false))

    override fun onBindViewHolder(holder: Row, position: Int) {
        val line = lines[position]
        holder.itemView.findViewById<android.widget.TextView>(R.id.cart_row_title).text = line.title
        holder.itemView.findViewById<android.widget.TextView>(R.id.cart_row_price).text = line.price
        holder.itemView.setOnClickListener { onRowTapped(line) }
    }

    override fun getItemCount(): Int = lines.size

    fun refresh(fresh: List<CartLine>) {
        lines.clear()
        lines.addAll(fresh)
        notifyDataSetChanged()
        recycler.scrollToPosition(0)
    }
}
