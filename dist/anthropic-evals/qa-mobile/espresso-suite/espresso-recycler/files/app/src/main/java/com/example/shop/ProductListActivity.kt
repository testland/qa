class ProductListActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_product_list)
        val recycler = findViewById<RecyclerView>(R.id.products)   // 120 products, Trail Shoes is near the end
        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) { api.products() }   // Retrofit + OkHttp
            recycler.adapter = ProductAdapter(products) { open(it) }
        }
    }
}
