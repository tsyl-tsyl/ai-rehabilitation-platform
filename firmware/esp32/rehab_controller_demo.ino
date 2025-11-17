#define BLINKER_BLE
#include <Blinker.h>
#include <Ticker.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "FOCStepMotor.hpp"
//屏幕引脚定义
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
//创建blinker控制器
BlinkerButton Button1("1");//加康复次数
BlinkerButton Button2("2");//减康复次数
BlinkerNumber Number1("number");//康复次数
BlinkerNumber Number2("speed");//康复速度
BlinkerNumber Number3("angle");//康复角度
BlinkerSlider Slider1("speed_control"); //Rehab_speed
BlinkerSlider Slider2("angle_control"); //Rehab_angle
BlinkerSlider Slider3("posion_right"); //右腿升降控制
BlinkerSlider Slider4("posion_left"); //左腿升降控制
//创建定时器
Ticker ticker1;
Ticker ticker2;
// 创建SSD1306对象
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

FOCStepMotor StepMotr(Serial2);

//变量声明
int ID[]={1,2,3,4}; //每个ID 对应了一个电机：index 0-左腿康复 1-左腿升降 2-右腿康复 3-右腿升降
int Rehab_number = 0;
int Rehab_speed = 0;
int Rehab_angle = 0; //Angle的值为0-90，对应中间往两边转0-90度 (旋转角度中间是0，最左边是-90，最右边是90)

int Rehab_deg = 0; //角度，左腿角度是deg，右腿角度是
int Motor_flag = 0; //标志位 因为Blinker.run没办法放中断
int Current_angle = 0;

// 定时器中断函数
void tick1(){
  // JY901_read();
  
 Date_Display();
}
void tick2(){
  Blinker.run();
}
//callback
void button1_callback(const String & state) //加康复次数
{
  //digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); //LED状态取反，测试用
  BLINKER_LOG("get button state: ", state);
  Rehab_number += 5;
    if (Rehab_number >= 100){
      Rehab_number = 100;
    }
  //Serial.println("button 1 pressed - Rehab number +");
}
void button2_callback(const String & state){ //减康复次数
  BLINKER_LOG("get button state: ", state);
  Rehab_number -= 5;
    if (Rehab_number <= 0){
      Rehab_number = 0;
    }
  //Serial.println("button 2 pressed - Rehab number -");
}
void slider1_callback(int32_t value1) //速度
{
    BLINKER_LOG("get slider1 value: ", value1);
    Rehab_speed = value1;
  //Serial.println("Set speed " + Rehab_speed);
}
void slider2_callback(int32_t value2) //角度
{
    BLINKER_LOG("get slider2 value: ", value2);
    Rehab_angle = value2;
  //Serial.println("Set angle " + Rehab_angle);
}
void slider3_callback(int32_t value3) //左腿升降
{
    BLINKER_LOG("get slider3 value: ", value3);
    StepMotr.Pos_Control(ID[1], 1, 200, 100, value3, 1, 1);//电机2  1 右腿上升  0 右腿下降
  //Serial.println("Left leg " + value3);

}
void slider4_callback(int32_t value4) //右腿升降
{
    BLINKER_LOG("get slider3 value: ", value4);
    StepMotr.Pos_Control(ID[3], 1, 200, 100, value4, 1, 1);//电机4  1 右腿上升  0 右腿下降
  //Serial.println("Right leg " + value4);
}
void dataRead(const String & data) //次数
{
    BLINKER_LOG("Blinker readString: ", data);
    Number1.print(Rehab_number);
    Number2.print(Rehab_speed);
    Number3.print(Rehab_angle);
}

void setup() {

  Serial2.begin(115200, SERIAL_8N1, 17, 18);
  // put your setup code here, to run once:
  Wire.begin(16,15);//SDA SCL
  // 初始化OLED屏幕
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C); // 传入I2C地址
  display.clearDisplay(); // 清空屏幕缓冲区
  display.setTextSize(1); // 设置字体大小（1-8）
  display.setTextColor(WHITE); // 设置字体颜色为白色
  ticker1.attach_ms(10,tick1);
  ticker2.attach_ms(1,tick2);
  Serial.begin(115200);
  BLINKER_DEBUG.stream(Serial);
  pinMode(21, OUTPUT);
  digitalWrite(21,LOW);
  Blinker.begin();
  Button1.attach(button1_callback);
  Button2.attach(button2_callback);
  Blinker.attachData(dataRead);
  Slider1.attach(slider1_callback);
  Slider2.attach(slider2_callback);
  Slider3.attach(slider3_callback);
  Slider4.attach(slider4_callback);
  
}

void loop() {
  // put your main code here, to run repeatedly:
  

  // if (Rehab_number > 0){
  //   if (Motor_flag < Rehab_angle){
  //     Rehab_speed++;
      
  //   }
  // }

  //StepMotr.Pos_Control(ID[0], 1, Rehab_speed, 100, 3200/360*Current_angle*50, 0, 0);

  //if (Rehab_number > 0){
    int Rehab_angle_cur = 30;
    Rehab_speed = 200;
    //for (int i = 0; i <= Rehab_angle_cur; i++){
      StepMotr.Pos_Control(ID[0], 1, Rehab_speed, 100, 3200/360*30*50, 1, 0);//电机1  1 正面看逆时针  电机1  0 正面看顺时针 
      delay(3000);
    //}
    //for (int i = Rehab_angle_cur; i >= 0; i--){
      StepMotr.Pos_Control(ID[0], 0, Rehab_speed, 100, 3200/360*30*50, 1, 0);//电机1  1 正面看逆时针  电机1  0 正面看顺时针 
      delay(3000);
   // }
  //}
  
}

void  Date_Display(void){
   display.clearDisplay();
   display.setCursor(36, 0); display.print("LBR Control");

   display.setCursor(8, 15); display.print("Rehab_number:");
   display.setCursor(90, 15); display.print(Rehab_number);

   display.setCursor(8, 30); display.print("Rehab_speed:");
   display.setCursor(82, 30); display.print(Rehab_speed);
   display.setCursor(98, 30); display.print("r/min");

   display.setCursor(8, 50); display.print("Rehab_angle:");
   display.setCursor(82, 50); display.print(Rehab_angle);
   display.setCursor(98, 50); display.print("deg");
   display.display(); // 刷新屏幕，将缓冲区内容显示出来
}
